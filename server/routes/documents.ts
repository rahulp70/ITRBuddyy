import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type Status = "processing" | "completed" | "error";

type Quality = "good" | "low" | "unreadable";

interface ExtractedField {
  name: string;
  value: string | number;
  confidence: number; // 0..1
  source: string; // e.g. "ocr:pdf" | "ocr:vision" | "rule:regex"
}

interface ExtractedPayload {
  docType: string;
  quality: Quality;
  fields: ExtractedField[];
  summary: { income: number; deductions: number; taxableIncome: number };
  messages: string[];
}

interface Doc {
  id: string;
  userId: string;
  name: string;
  type: string; // mime
  size: number;
  uploadedAt: number;
  status: Status;
  error?: string;
  docTypeLabel?: string; // as selected by user
  extracted?: ExtractedPayload;
}

const docs = new Map<string, Doc>();

function parseAmount(s: string): number | null {
  const m = s.replace(/[,\s₹]/g, "").match(/(-?\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]));
}

function extractHeuristics(text: string, docType: string): ExtractedPayload {
  const lines = text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lower = text.toLowerCase();
  const fields: ExtractedField[] = [];

  // PAN
  const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
  if (panMatch) {
    fields.push({ name: "PAN", value: panMatch[0], confidence: 0.95, source: "rule:regex" });
  }

  // Employer
  const employerLine = lines.find((l) => /employer|company|deductor/i.test(l));
  if (employerLine) {
    const name = employerLine.replace(/^(Employer|Company|Deductor)\s*[:\-]\s*/i, "");
    if (name && /[A-Za-z]/.test(name)) {
      fields.push({ name: "Employer", value: name, confidence: 0.8, source: "rule:line" });
    }
  }

  // Amount-like lines
  const amountCandidates = lines.filter((l) => /(salary|gross|taxable|tds|deduction|income)/i.test(l) && /\d/.test(l));
  const findAmount = (labelRegex: RegExp, name: string, confBase = 0.8) => {
    const line = amountCandidates.find((l) => labelRegex.test(l));
    if (line) {
      const amt = parseAmount(line);
      if (amt !== null) fields.push({ name, value: amt, confidence: confBase, source: "rule:regex" });
    }
  };

  if (/form\s*16/i.test(docType) || /salary\s*slip/i.test(docType)) {
    findAmount(/(gross\s*salary|total\s*salary|income\s*from\s*salary)/i, "Salary", 0.9);
    findAmount(/(taxable\s*income|total\s*taxable)/i, "Taxable Income", 0.85);
    findAmount(/(tds|tax\s+deducted)/i, "TDS", 0.8);
    findAmount(/(deduction|80c|80d|80tta|investments)/i, "Deductions", 0.7);
  } else if (/26as|ais/i.test(docType)) {
    findAmount(/(tds|tax\s+deducted)/i, "TDS", 0.9);
    findAmount(/(total\s*income|reported\s*income)/i, "Reported Income", 0.8);
    findAmount(/(taxable\s*income)/i, "Taxable Income", 0.75);
  } else if (/investment/i.test(docType)) {
    findAmount(/(80c|ppf|elss|lic|nsc)/i, "Eligible 80C", 0.85);
  } else if (/bank/i.test(docType)) {
    findAmount(/(interest\s*income)/i, "Interest Income", 0.75);
  }

  // Compose summary
  const get = (n: string): number => Number(fields.find((f) => f.name === n)?.value ?? 0);
  const salary = get("Salary");
  const deductions = get("Deductions") || get("Eligible 80C");
  const taxable = get("Taxable Income") || Math.max(0, salary - deductions);

  // Determine quality
  let quality: Quality = "good";
  if (!text || text.trim().length < 20) quality = "unreadable";
  const criticalFound = [panMatch, salary || get("Reported Income"), get("TDS")].filter(Boolean).length;
  if (quality !== "unreadable" && criticalFound < 2) quality = "low";

  const messages: string[] = [];
  if (quality !== "good") {
    messages.push(
      "We were unable to extract all necessary details accurately from this document. Please either upload a clearer / higher quality version or enter the details manually."
    );
  }

  return {
    docType,
    quality,
    fields,
    summary: { income: salary || get("Reported Income") || 0, deductions: deductions || 0, taxableIncome: taxable || 0 },
    messages,
  };
}

async function parsePdfText(file: Express.Multer.File): Promise<string> {
  try {
    // pdf-parse is a CJS module, import dynamically
    const mod = await import("pdf-parse");
    const pdfParse = (mod as any).default || (mod as any);
    const result = await pdfParse(file.buffer);
    return String(result.text || "");
  } catch (e) {
    return "";
  }
}

async function extractWithVisionIfPossible(file: Express.Multer.File, requestedDocType: string): Promise<ExtractedPayload | null> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;
    if (!/^image\//.test(file.mimetype)) return null;
    const b64 = file.buffer.toString("base64");
    const dataUrl = `data:${file.mimetype};base64,${b64}`;
    const system =
      "You are an OCR+NLP extractor for Indian tax documents. Return ONLY compact JSON with fields: fields:[{name,value,confidence,source}], summary:{income,deductions,taxableIncome}, quality: 'good'|'low'|'unreadable', messages: string[]. Focus on PAN, Salary/Income, TDS, Deductions, Employer.";
    const userContent = [
      { type: "input_image", image_url: dataUrl },
      { type: "text", text: `Extract key fields from this ${requestedDocType}. Return JSON only.` },
    ];
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "system", content: system }, { role: "user", content: userContent }] }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(text.slice(start, end + 1));
      const fields: ExtractedField[] = Array.isArray(parsed.fields)
        ? parsed.fields.map((f: any) => ({
            name: String(f.name),
            value: typeof f.value === "number" ? f.value : String(f.value),
            confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.7)),
            source: String(f.source || "ocr:vision"),
          }))
        : [];
      const income = Number(parsed.summary?.income ?? 0) || 0;
      const deductions = Number(parsed.summary?.deductions ?? 0) || 0;
      const taxableIncome = Number(parsed.summary?.taxableIncome ?? Math.max(0, income - deductions)) || 0;
      const quality: Quality = parsed.quality === "unreadable" ? "unreadable" : parsed.quality === "low" ? "low" : "good";
      const messages: string[] = Array.isArray(parsed.messages) ? parsed.messages.map((m: any) => String(m)) : [];
      return { docType: requestedDocType, quality, fields, summary: { income, deductions, taxableIncome }, messages };
    }
    return null;
  } catch {
    return null;
  }
}

function computeIssuesForUser(userId: string): string[] {
  const userDocs = Array.from(docs.values()).filter((d) => d.userId === userId && d.extracted);
  const issues: string[] = [];
  const f16 = userDocs.find((d) => /form\s*16/i.test(d.extracted!.docType));
  const slip = userDocs.find((d) => /salary\s*slip/i.test(d.extracted!.docType));
  const f26 = userDocs.find((d) => /26as|ais/i.test(d.extracted!.docType));
  const getField = (doc: Doc | undefined, name: string): number => {
    if (!doc?.extracted) return 0;
    const f = doc.extracted.fields.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return Number(f?.value || 0);
  };
  if (f16 && slip) {
    const s1 = getField(f16, "Salary") || f16.extracted!.summary.income;
    const s2 = getField(slip, "Salary") || slip.extracted!.summary.income;
    if (s1 && s2) {
      const diff = Math.abs(s1 - s2) / Math.max(s1, s2);
      if (diff > 0.02) issues.push("Salary mismatch between Form 16 and Salary Slip.");
    }
  }
  if (f16 && f26) {
    const t1 = f16.extracted!.summary.taxableIncome;
    const t2 = f26.extracted!.summary.taxableIncome || getField(f26, "Taxable Income");
    if (t1 && t2) {
      const diff = Math.abs(t1 - t2) / Math.max(t1, t2);
      if (diff > 0.05) issues.push("Reported taxable income differs between Form 16 and 26AS/AIS.");
    }
  }
  return issues;
}

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const selectedDocType = String((req.body?.docType as string) || "");
  if (!file) return res.status(400).json({ error: "file is required" });
  const userId: string = ((req as any).user?.sub as string) || "dev-user";

  const id = randomUUID();
  const doc: Doc = {
    id,
    userId,
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    uploadedAt: Date.now(),
    status: "processing",
    docTypeLabel: selectedDocType,
  };
  docs.set(id, doc);

  (async () => {
    const d = docs.get(id);
    if (!d) return;
    try {
      let extracted: ExtractedPayload | null = null;
      if (/^application\/pdf/.test(file.mimetype)) {
        const text = await parsePdfText(file);
        extracted = extractHeuristics(text, selectedDocType || d.name);
      } else if (/^image\//.test(file.mimetype)) {
        extracted = await extractWithVisionIfPossible(file, selectedDocType || d.name);
        if (!extracted) {
          extracted = extractHeuristics("", selectedDocType || d.name);
        }
      } else {
        extracted = extractHeuristics("", selectedDocType || d.name);
      }

      d.status = "completed";
      d.error = undefined;
      d.extracted = extracted!;
      docs.set(id, d);
    } catch (e) {
      d.status = "error";
      d.error = "Extraction failed";
      docs.set(id, d);
    }
  })();

  return res.status(201).json({ id, status: doc.status, name: doc.name, type: doc.type, size: doc.size });
});

router.get("/:id/status", (req, res) => {
  const d = docs.get(req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  return res.json({ id: d.id, status: d.status, error: d.error });
});

router.get("/:id/data", (req, res) => {
  const d = docs.get(req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  const extracted = d.extracted || null;
  const legacy = extracted ? extracted.summary : null;
  const issues = computeIssuesForUser(d.userId);
  return res.json({ id: d.id, extractedData: legacy, extracted, issues });
});

router.post("/:id/feedback", (req: Request, res: Response) => {
  const d = docs.get(req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
  if (!d.extracted) return res.status(400).json({ error: "no-extracted-data" });
  for (const f of fields) {
    if (!f || typeof f.name !== "string") continue;
    const idx = d.extracted.fields.findIndex((x) => x.name.toLowerCase() === f.name.toLowerCase());
    const val = typeof f.value === "number" ? f.value : isNaN(Number(f.value)) ? String(f.value) : Number(f.value);
    const upd = { name: f.name, value: val, confidence: 1.0, source: "user:manual" } as any;
    if (idx >= 0) d.extracted.fields[idx] = upd;
    else d.extracted.fields.push(upd);
  }
  const get = (n: string): number => Number(d.extracted!.fields.find((f) => f.name.toLowerCase() === n.toLowerCase())?.value ?? 0);
  const income = get("Salary") || get("Reported Income") || d.extracted!.summary.income;
  const deductions = get("Deductions") || get("Eligible 80C") || d.extracted!.summary.deductions;
  const taxableIncome = get("Taxable Income") || Math.max(0, income - deductions);
  d.extracted.summary = { income, deductions, taxableIncome };
  d.extracted.quality = "good";
  d.extracted.messages = d.extracted.messages || [];
  d.extracted.messages = d.extracted.messages.filter((m) => !/unable to extract/i.test(m));
  docs.set(d.id, d);
  return res.json({ ok: true });
});

export default router;
