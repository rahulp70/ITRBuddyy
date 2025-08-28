import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
// Auth optional for development; integrate JWT later

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type Status = "processing" | "completed" | "error";

interface Doc {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  status: Status;
  error?: string;
  extractedData?: { income: number; deductions: number; taxableIncome: number };
}

const docs = new Map<string, Doc>();

function simpleExtract(name: string) {
  const lower = name.toLowerCase();
  const base = 900000 + Math.floor(Math.random() * 150000);
  const deductions = 150000;
  const taxableIncome = base - deductions;
  return { income: base, deductions, taxableIncome };
}

router.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
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
  };
  docs.set(id, doc);

  // Simulate async processing + extraction (replace with OCR + NLP integration)
  setTimeout(() => {
    const d = docs.get(id);
    if (!d) return;
    const ok = Math.random() < 0.95;
    d.status = ok ? "completed" : "error";
    d.error = ok ? undefined : "OCR failed";
    if (ok) {
      d.extractedData = simpleExtract(d.name);
    }
    docs.set(id, d);
  }, 1000);

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
  return res.json({ id: d.id, extractedData: d.extractedData || null });
});

export default router;
