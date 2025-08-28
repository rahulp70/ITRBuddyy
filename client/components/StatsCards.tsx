import { Card, CardContent } from "@/components/ui/card";
import { Calculator, FileText, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export default function StatsCards() {
  const docs = useDocs();
  const stats = useMemo(() => {
    const extracted = docs.filter((d) => d.status === "extracted");
    const getField = (d: DocRecord, name: string): number => {
      const f = d.fields?.find((x) => x.name.toLowerCase() === name.toLowerCase());
      return typeof f?.value === "number" ? (f?.value as number) : Number(f?.value) || 0;
    };
    const sumKey = (key: string) => extracted.reduce((s, d) => s + (typeof (d.keySummary as any)?.[key] === "number" ? ((d.keySummary as any)[key] as number) : 0), 0);

    const totalSalary = sumKey("Salary");
    const taxableIncome = sumKey("Taxable Income");
    const totalDeductions = extracted.reduce((s, d) => s + (typeof (d.keySummary as any)?.["Deductions"] === "number" ? ((d.keySummary as any)["Deductions"] as number) : 0) + (typeof (d.keySummary as any)?.["Eligible 80C (est.)"] === "number" ? ((d.keySummary as any)["Eligible 80C (est.)"] as number) : 0), 0);
    const totalInvestments = extracted.reduce((s, d) => s + getField(d, "Eligible 80C"), 0);
    const totalInterest = extracted.reduce((s, d) => s + getField(d, "Interest Income"), 0);
    const totalTDS = extracted.reduce((s, d) => s + getField(d, "TDS"), 0);
    const estimatedTax = Math.max(0, Math.round(Math.max(0, taxableIncome) * 0.1));
    const estimatedRefund = Math.max(0, totalTDS - estimatedTax);

    return { totalSalary, taxableIncome, totalDeductions, totalInvestments, totalInterest, totalTDS, estimatedTax, estimatedRefund };
  }, [docs]);

  const cards = [
    { title: "Total Earnings", value: stats.totalSalary, icon: <Wallet className="w-6 h-6 text-brand-600" /> },
    { title: "Total Deductions", value: stats.totalDeductions, icon: <TrendingUp className="w-6 h-6 text-blue-600" /> },
    { title: "Taxable Income", value: stats.taxableIncome, icon: <FileText className="w-6 h-6 text-orange-600" /> },
    { title: "Est. Refund", value: stats.estimatedRefund, icon: <Calculator className="w-6 h-6 text-success-600" /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{c.title}</p>
                <p className="text-2xl font-bold text-gray-900">₹{c.value.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">{c.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
