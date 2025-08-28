import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { requireAuth } from "./auth";

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

router.post("/upload", requireAuth as any, upload.single("file"), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "file is required" });
  // @ts-ignore
  const userId: string = (req.user?.sub as string) || "user";

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

  // Simulate async processing
  setTimeout(() => {
    const d = docs.get(id);
    if (!d) return;
    const ok = Math.random() < 0.9;
    d.status = ok ? "completed" : "error";
    d.error = ok ? undefined : "OCR failed";
    if (ok) {
      d.extractedData = {
        income: 950000 + Math.floor(Math.random() * 50000),
        deductions: 150000,
        taxableIncome: 800000 + Math.floor(Math.random() * 50000),
      };
    }
    docs.set(id, d);
  }, 800);

  return res.status(201).json({ id, status: doc.status, name: doc.name, type: doc.type, size: doc.size });
});

router.get("/:id/status", requireAuth as any, (req, res) => {
  const d = docs.get(req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  return res.json({ id: d.id, status: d.status, error: d.error });
});

router.get("/:id/data", requireAuth as any, (req, res) => {
  const d = docs.get(req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  return res.json({ id: d.id, extractedData: d.extractedData || null });
});

export default router;
