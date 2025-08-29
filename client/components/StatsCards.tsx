import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

type DocRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  docType: string;
  status: string;
  keySummary?: Record<string, number | string>;
  fields?: { name: string; value: string | number }[];
};

function useDocs() {
  const [docs, setDocs] = useState<DocRecord[]>(() => {
    try {
      const raw = localStorage.getItem("itr:docManager");
      if (!raw) return [];
      return JSON.parse(raw) as DocRecord[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const onUpdate = (e: any) => {
      const payload = e?.detail?.docs as DocRecord[] | undefined;
      if (Array.isArray(payload)) setDocs(payload);
      else {
        try {
          const raw = localStorage.getItem("itr:docManager");
          if (raw) setDocs(JSON.parse(raw));
        } catch {}
      }
    };
    window.addEventListener("itr:docs-updated", onUpdate);
    return () => window.removeEventListener("itr:docs-updated", onUpdate);
  }, []);
  return docs;
}

function useManualWorking() {
  const [working, setWorking] = useState<{ docId: string; fields: Record<string, any> } | null>(() => {
    try {
      const raw = sessionStorage.getItem("itr:manual:working");
      return raw ? (JSON.parse(raw) as any) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    const onWorking = () => {
      try {
        const raw = sessionStorage.getItem("itr:manual:working");
        setWorking(raw ? (JSON.parse(raw) as any) : null);
      } catch {
        setWorking(null);
      }
    };
    window.addEventListener("itr:manual-working", onWorking);
    return () => window.removeEventListener("itr:manual-working", onWorking);
  }, []);
  return working;
}

function getField(d: DocRecord, name: string): number {
  const f = d.fields?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return typeof f?.value === "number" ? (f?.value as number) : Number(f?.value) || 0;
}

function getKey(d: DocRecord, key: string): number {
  return typeof (d.keySummary as any)?.[key] === "number" ? ((d.keySummary as any)[key] as number) : 0;
}

export default function StatsCards() {
  const docs = useDocs();
  const working = useManualWorking();

  const base = useMemo(() => {
    const extracted = docs.filter((d) => d.status === "extracted");
    const totalSalary = extracted.reduce((s, d) => s + getKey(d, "Salary"), 0);
    const taxableIncome = extracted.reduce((s, d) => s + getKey(d, "Taxable Income"), 0);
    const totalDeductions = extracted.reduce(
      (s, d) => s + getKey(d, "Deductions") + getKey(d, "Eligible 80C (est.)"),
      0
    );
    const totalTDS = extracted.reduce((s, d) => s + getField(d, "TDS"), 0);
    const estimatedTax = Math.max(0, Math.round(Math.max(0, taxableIncome) * 0.1));
    const net = totalTDS - estimatedTax;
    const refund = Math.max(0, net);
    const taxPayable = Math.max(0, -net);
    return { totalSalary, taxableIncome, totalDeductions, totalTDS, estimatedTax, refund, taxPayable };
  }, [docs]);

  const stats = useMemo(() => {
    if (!working) return base;
    const d = docs.find((x) => x.id === working.docId && x.status === "extracted");
    if (!d) return base;

    const origSalary = getKey(d, "Salary");
    const origTaxable = getKey(d, "Taxable Income");
    const origDeductions = getKey(d, "Deductions") + getKey(d, "Eligible 80C (est.)");
    const origTDS = getField(d, "TDS");

    const w = working.fields || {};
    const ovSalary = Number(w["Salary"] ?? w["Gross Salary"] ?? 0) || 0;
    const ovDeductions = (Number(w["Deductions"] ?? 0) || 0) + (Number(w["Eligible 80C"] ?? 0) || 0);
    const ovTaxable = Number(
      w["Taxable Income"] ?? Math.max(0, (Number(w["Salary"] ?? 0) || 0) - (Number(w["Deductions"] ?? 0) || 0))
    );
    const ovTDS = Number(w["TDS"] ?? 0) || 0;

    const totalSalary = base.totalSalary + (ovSalary - origSalary);
    const totalDeductions = base.totalDeductions + (ovDeductions - origDeductions);
    const taxableIncome = base.taxableIncome + (ovTaxable - origTaxable);
    const totalTDS = base.totalTDS + (ovTDS - origTDS);

    const estimatedTax = Math.max(0, Math.round(Math.max(0, taxableIncome) * 0.1));
    const net = totalTDS - estimatedTax;
    const refund = Math.max(0, net);
    const taxPayable = Math.max(0, -net);

    return { totalSalary, taxableIncome, totalDeductions, totalTDS, estimatedTax, refund, taxPayable };
  }, [base, docs, working]);

  const metrics: { key: keyof typeof stats; label: string; info: string }[] = [
    { key: "totalSalary", label: "Total Earnings", info: "Sum of 'Salary' across extracted documents (e.g., Form 16, Salary Slips)." },
    { key: "totalDeductions", label: "Total Deductions", info: "Sum of deduction fields and eligible 80C amounts from uploaded proofs and manual entries." },
    { key: "taxableIncome", label: "Taxable Income", info: "Aggregated 'Taxable Income' from documents. If unavailable, approximated as Salary minus Deductions." },
    { key: "totalTDS", label: "Tax Paid (TDS)", info: "Sum of TDS captured from documents like Form 16/26AS." },
  ];

  const netLabel = stats.refund > 0 ? "Estimated Refund" : "Tax Payable";
  const netValue = stats.refund > 0 ? stats.refund : stats.taxPayable;
  const netInfo =
    "Based on a demo flat 10% tax on aggregated taxable income minus TDS. For production, apply actual slabs and cess.";

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Live summary updates as you upload or edit details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((m) => (
            <div key={m.key} className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {m.label}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{m.info}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-2xl font-bold">₹{(stats as any)[m.key].toLocaleString()}</div>
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {netLabel}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{netInfo}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={`text-2xl font-bold ${stats.refund > 0 ? "text-success-700" : "text-orange-700"}`}>
              ₹{netValue.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">View detailed breakdown</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calculation Breakdown</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <strong>Total Earnings:</strong> Sum of 'Salary' across documents like Form 16 and Salary Slips.
                </div>
                <div>
                  <strong>Total Deductions:</strong> Sum of 'Deductions' and eligible 80C amounts from proofs (Investment, Rent, Medical, Loan statements).
                </div>
                <div>
                  <strong>Taxable Income:</strong> Aggregated 'Taxable Income' (or approximated as Salary minus Deductions when not provided).
                </div>
                <div>
                  <strong>Tax Paid (TDS):</strong> Sum of TDS amounts from documents (e.g., Form 16/26AS).
                </div>
                <div>
                  <strong>Estimated Refund/Tax Payable:</strong> Calculated using a demo flat 10% rate for preview. Actual computation should apply slab rates, cess, surcharge, and rebates.
                </div>
                <div className="text-xs text-gray-500">
                  Figures update in real-time when editing fields. Save changes to persist them to your document.
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
