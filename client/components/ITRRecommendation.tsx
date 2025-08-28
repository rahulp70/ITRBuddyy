import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DocRecord = {
  id: string;
  docType: string;
  status: string;
};

function useDocs() {
  const [docs, setDocs] = useState<DocRecord[]>(() => {
    try {
      const raw = localStorage.getItem("itr:docManager");
      if (!raw) return [];
      return (JSON.parse(raw) as any[]).map((d) => ({ id: d.id, docType: d.docType, status: d.status }));
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const onUpdate = (e: any) => {
      const payload = e?.detail?.docs as any[] | undefined;
      if (Array.isArray(payload)) setDocs(payload.map((d) => ({ id: d.id, docType: d.docType, status: d.status })));
      else {
        try {
          const raw = localStorage.getItem("itr:docManager");
          if (raw) setDocs((JSON.parse(raw) as any[]).map((d) => ({ id: d.id, docType: d.docType, status: d.status })));
        } catch {}
      }
    };
    window.addEventListener("itr:docs-updated", onUpdate);
    return () => window.removeEventListener("itr:docs-updated", onUpdate);
  }, []);
  return docs;
}

export default function ITRRecommendation() {
  const docs = useDocs();
  const rec = useMemo(() => {
    const types = new Set(docs.filter((d) => d.status === "extracted").map((d) => d.docType));
    const hasBusiness = types.has("Business Income Document");
    const hasCapitalGains = types.has("Capital Gains Report");
    const hasRent = types.has("Rent Receipt");
    const onlySalary = types.has("Form 16") || types.has("Salary Slip");

    let form = "ITR-1 (Sahaj)";
    let reason = "Income from salary and/or interest only.";
    if (hasBusiness) {
      form = "ITR-3";
      reason = "Income from business/profession.";
    } else if (hasCapitalGains) {
      form = "ITR-2";
      reason = "Capital gains income present.";
    } else if (hasRent) {
      form = "ITR-2";
      reason = "Income from house property (rent) likely.";
    } else if (!onlySalary) {
      form = "ITR-2";
      reason = "Multiple income sources detected.";
    }
    return { form, reason };
  }, [docs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">ITR Form Recommendation</CardTitle>
        <CardDescription>Updates automatically based on your uploaded data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-gray-900 font-semibold">Recommended: {rec.form}</div>
        <div className="text-sm text-gray-600 mt-1 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 text-gray-500" /> {rec.reason}</div>
        <div className="text-sm text-blue-600 mt-3">
          Learn more on the official portal: <a href="https://incometaxindia.gov.in" target="_blank" rel="noreferrer" className="underline">incometaxindia.gov.in</a>
        </div>
      </CardContent>
    </Card>
  );
}
