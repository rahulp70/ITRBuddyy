import { Router, Request, Response } from "express";
// Auth optional for development; integrate JWT later

const router = Router();

interface ItrForm {
  id: string; // document id
  userId: string;
  income: { salary: number; interest: number; rentalIncome: number; otherIncome: number };
  deductions: { section80C: number; section80D: number; charitableDonations: number };
  investments: { ppf: number; elss: number; nps: number };
  taxesPaid: { tds: number; advanceTax: number; selfAssessmentTax: number };
  notes?: string;
  status: "draft" | "submitted";
}

const forms = new Map<string, ItrForm>();

function validate(form: ItrForm) {
  const issues: { field: string; code: string; message: string }[] = [];
  const totalIncome = form.income.salary + form.income.interest + form.income.rentalIncome + form.income.otherIncome;
  const totalDeductions = form.deductions.section80C + form.deductions.section80D + form.deductions.charitableDonations;
  if (form.deductions.section80C > 150000) {
    issues.push({ field: "deductions.section80C", code: "LIMIT_80C", message: "Section 80C exceeds limit (1,50,000)." });
  }
  if (form.taxesPaid.tds > totalIncome) {
    issues.push({ field: "taxesPaid.tds", code: "TDS_GT_INCOME", message: "TDS cannot exceed total income." });
  }
  if (totalDeductions > totalIncome) {
    issues.push({ field: "deductions.section80C", code: "DEDUCTIONS_GT_INCOME", message: "Total deductions exceed total income." });
  }
  return { issues, totals: { totalIncome, totalDeductions } };
}

router.get("/:id", (req: Request, res: Response) => {
  const userId = ((req as any).user?.sub as string) || "dev-user";
  const id = req.params.id;
  let form = forms.get(id);
  if (!form) {
    form = {
      id,
      userId,
      income: { salary: 1200000, interest: 15000, rentalIncome: 0, otherIncome: 5000 },
      deductions: { section80C: 150000, section80D: 25000, charitableDonations: 10000 },
      investments: { ppf: 60000, elss: 40000, nps: 20000 },
      taxesPaid: { tds: 90000, advanceTax: 10000, selfAssessmentTax: 0 },
      notes: "Imported from extracted documents.",
      status: "draft",
    };
    forms.set(id, form);
  }
  return res.json(form);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = req.params.id;
  const body = req.body as Partial<ItrForm>;
  const existing = forms.get(id);
  if (!existing) return res.status(404).json({ error: "Form not found" });
  const updated = { ...existing, ...body, id: existing.id, userId: existing.userId };
  forms.set(id, updated);
  return res.json(updated);
});

router.post("/:id/validate", (req: Request, res: Response) => {
  const id = req.params.id;
  const form = forms.get(id);
  if (!form) return res.status(404).json({ error: "Form not found" });
  const result = validate(form);
  return res.json(result);
});

router.post("/:id/submit", (req: Request, res: Response) => {
  const id = req.params.id;
  const existing = forms.get(id);
  if (!existing) return res.status(404).json({ error: "Form not found" });
  const result = validate(existing);
  existing.status = "submitted";
  forms.set(id, existing);
  return res.json({ id, status: existing.status, message: "Submitted for AI validation", ...result });
});

export default router;
