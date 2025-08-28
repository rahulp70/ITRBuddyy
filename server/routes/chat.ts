import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

type Msg = { id: string; role: "user" | "assistant"; text: string; ts: number };
const conversations = new Map<string, Msg[]>();

import { getAllDocs } from "./documents";

function buildUserContext(userId: string) {
  const docs = getAllDocs().filter((d) => d.userId === userId && d.status !== "error");
  if (!docs.length) return "No uploaded docs in context.";
  const parts = docs.map((d) => {
    const sum = d.extracted?.summary;
    const fields = d.extracted?.fields?.slice(0, 8)?.map((f) => `${f.name}: ${f.value} (${Math.round(f.confidence * 100)}%)`).join(", ") || "";
    return `• ${d.docTypeLabel || d.name} – status: ${d.status}${sum ? ` | income: ${sum.income}, deductions: ${sum.deductions}, taxable: ${sum.taxableIncome}` : ""}${fields ? ` | fields: ${fields}` : ""}`;
  });
  return parts.join("\n");
}

function aggregateForTips(userId: string) {
  const docs = getAllDocs().filter((d) => d.userId === userId && d.extracted);
  const findAll = (name: string) =>
    docs.flatMap((d) => (d.extracted?.fields || []).filter((f) => f.name.toLowerCase() === name.toLowerCase())) as { name: string; value: any }[];
  const getSum = (name: string) =>
    findAll(name).reduce((s, f) => s + (typeof f.value === "number" ? f.value : Number(f.value) || 0), 0);
  const hasDocType = (kw: RegExp) => docs.some((d) => kw.test((d.docTypeLabel || d.name || "").toLowerCase()));

  const salary = getSum("Salary");
  const tds = getSum("TDS");
  const taxable = docs.reduce((s, d) => s + (d.extracted?.summary.taxableIncome || 0), 0);
  const inv80c = getSum("Eligible 80C");
  const hra = getSum("HRA");
  const bankInterest = getSum("Interest Income");
  const medicalExp = getSum("Medical Expense");
  const loanInterest = getSum("Interest Paid");

  return { salary, tds, taxable, inv80c, hra, bankInterest, medicalExp, loanInterest, hasInvestment: hasDocType(/investment/), hasRent: hasDocType(/rent/), hasLoan: hasDocType(/loan/), hasSalarySlip: hasDocType(/salary\s*slip/), hasForm16: hasDocType(/form\s*16/), hasMedical: hasDocType(/medical/) };
}

function generateDeductionTips(userId: string) {
  const a = aggregateForTips(userId);
  const tips: string[] = [];
  const max80c = 150000;
  const used80c = Math.min(max80c, a.inv80c);
  const headroom80c = Math.max(0, max80c - used80c);
  if (headroom80c > 0) {
    tips.push(`• 80C headroom: You can invest up to ₹${headroom80c.toLocaleString()} more (PPF/ELSS/SSY/NSC/Principal on home loan).`);
  } else {
    tips.push("• Your Section 80C limit appears utilized. Consider 80CCD(1B) for an additional ₹50,000 via NPS.");
  }
  tips.push("• 80D: Health insurance premiums can save up to ₹25,000 (₹50,000 for senior citizens). Consider a family floater if not already insured.");
  if (a.bankInterest > 0) tips.push("• 80TTA: Deduction up to ₹10,000 for savings account interest (for non-senior citizens).");
  if (a.hasRent && a.hra > 0) tips.push("• HRA: Ensure rent receipts and landlord PAN (if required) to claim HRA exemption under section 10(13A).");
  if (!a.hasRent && a.hra > 0) tips.push("• Upload rent receipts to support HRA claim and maximize exemption.");
  if (a.loanInterest > 0) tips.push("• Home loan: Deduction under section 24(b) on interest up to ₹2,00,000 for self-occupied property. Principal also counts under 80C.");
  if (a.medicalExp > 0) tips.push("• If medical expenses are high for specified diseases, evaluate 80DDB eligibility (requires specific conditions and certificates).");
  tips.push("• Consider charitable donations (80G) to registered institutions for additional deductions.");

  const note = "See official guidance: https://incometaxindia.gov.in";
  const snapshot = `Current snapshot: Salary ₹${a.salary.toLocaleString()}, TDS ₹${a.tds.toLocaleString()}, 80C used ₹${used80c.toLocaleString()}, Savings interest ₹${a.bankInterest.toLocaleString()}, HRA ₹${a.hra.toLocaleString()}, Home-loan interest ₹${a.loanInterest.toLocaleString()}`;
  return `**Personalized Deduction Tips** 💡\n\n${snapshot}\n\n${tips.join("\n")}\n\n_Source: [incometaxindia.gov.in](https://incometaxindia.gov.in)`;
}

function replyFor(input: string, userId = "dev-user"): string {
  const q = input.toLowerCase();
  const ctx = buildUserContext(userId);
  if (q.includes("upload")) {
    return `**Upload Help** 📄\n\nClick 'Choose Files' or drag-and-drop PDF/JPG/PNG. Max 10MB each.\n\n_Current docs in context:_\n${ctx}`;
  }
  if (q.includes("80c") || q.includes("80d") || q.includes("deduction") || q.includes("tip") || q.includes("save tax")) {
    return generateDeductionTips(userId);
  }
  if (q.includes("status")) {
    return `**Processing Status** ⏱️\n\nCheck Dashboard → Uploaded Documents.\n\n_Current context:_\n${ctx}`;
  }
  return `**How I can help** 🤝\n- Uploads & extraction\n- Deductions & sections\n- ITR review & validation\n\n_Current context:_\n${ctx}`;
}

router.post("/", (req: Request, res: Response) => {
  const { conversationId, message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  const id = conversationId || randomUUID();
  const history = conversations.get(id) || [];
  const userMsg: Msg = { id: randomUUID(), role: "user", text: message, ts: Date.now() };
  history.push(userMsg);
  const text = replyFor(message);
  const bot: Msg = { id: randomUUID(), role: "assistant", text, ts: Date.now() };
  history.push(bot);
  conversations.set(id, history);
  return res.json({ conversationId: id, reply: text, messages: history });
});

// SSE streaming using OpenRouter if API key provided
router.get("/stream", async (req: Request, res: Response) => {
  const q = String(req.query.q || "");
  let conversationId = String(req.query.conversationId || "");
  if (!q) {
    res.status(400).end();
    return;
  }
  if (!conversationId) conversationId = randomUUID();
  const history = conversations.get(conversationId) || [];
  history.push({ id: randomUUID(), role: "user", text: q, ts: Date.now() });
  conversations.set(conversationId, history);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`event: meta\n`);
  res.write(`data: ${JSON.stringify({ conversationId })}\n\n`);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const canned = replyFor(q, "dev-user");
    const bot = { id: randomUUID(), role: "assistant" as const, text: canned, ts: Date.now() };
    history.push(bot);
    conversations.set(conversationId, history);
    res.write(`data: ${JSON.stringify({ delta: canned, done: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const userId = "dev-user";
    const userCtx = buildUserContext(userId);
    const messages = [
      { role: "system", content: "You are ITR Buddy, a helpful tax assistant for Indian income taxes. Format replies with Markdown. Use emojis where helpful (🎉, ⚠️, 💡). Be concise and professional." },
      { role: "system", content: `User context (docs & extracted data):\n${userCtx}` },
      ...history.map((m) => ({ role: m.role, content: m.text })),
    ];

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Upstream error ${upstream.status}`);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split(/\n/).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.replace(/^data:\s*/, "");
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              assistantText += delta;
              res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }
          } catch {}
        }
      }
    }
    history.push({ id: randomUUID(), role: "assistant", text: assistantText, ts: Date.now() });
    conversations.set(conversationId, history);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: "stream-failed" })}\n\n`);
    res.end();
  }
});

export default router;
