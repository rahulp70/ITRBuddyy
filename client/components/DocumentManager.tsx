import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Upload, CheckCircle, AlertCircle, MessageCircleQuestion, ListChecks, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export type DocType =
  | "Form 16"
  | "Form 26AS/AIS"
  | "Salary Slip"
  | "Bank Statement"
  | "Investment Proof"
  | "Rent Receipt"
  | "Loan Statement"
  | "Medical Bill"
  | "Capital Gains Report"
  | "Business Income Document";

const allDocTypes: DocType[] = [
  "Form 16",
  "Form 26AS/AIS",
  "Salary Slip",
  "Bank Statement",
  "Investment Proof",
  "Rent Receipt",
  "Loan Statement",
  "Medical Bill",
  "Capital Gains Report",
  "Business Income Document",
];

type Status = "pending" | "processing" | "extracted" | "error";

type ExtractedField = { name: string; value: string | number; confidence: number; source: string };

interface DocRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  docType: DocType;
  status: Status;
  keySummary?: Record<string, number | string>;
  fields?: ExtractedField[];
  quality?: "good" | "low" | "unreadable";
  messages?: string[];
  error?: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadge(s: Status) {
  if (s === "pending") return <Badge>Pending</Badge>;
  if (s === "processing") return <Badge className="bg-orange-100 text-orange-800">Processing</Badge>;
  if (s === "extracted") return <Badge className="bg-success-100 text-success-800">Extracted</Badge>;
  return <Badge variant="destructive">Error</Badge>;
}

export default function DocumentManager({ className }: { className?: string }) {
  const [selectedType, setSelectedType] = useState<DocType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>(() => {
    try {
      const raw = localStorage.getItem("itr:docManager");
      if (raw) {
        const parsed = JSON.parse(raw) as (Omit<DocRecord, "uploadedAt"> & { uploadedAt: string })[];
        return parsed.map((d) => ({ ...d, uploadedAt: new Date(d.uploadedAt) }));
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem(
      "itr:docManager",
      JSON.stringify(docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() })))
    );
  }, [docs]);

  const onAskAI = (text: string) => {
    window.dispatchEvent(new CustomEvent("chatbot:ask", { detail: { text } }));
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedType) return;

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pending: DocRecord = {
      id: tempId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date(),
      docType: selectedType as DocType,
      status: "pending",
    };
    setDocs((prev) => [pending, ...prev]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", selectedType);
    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      const newId = data.id as string;

      setDocs((prev) => prev.map((d) => (d.id === tempId ? { ...d, id: newId, status: "processing" } : d)));

      const poll = async () => {
        try {
          const s = await fetch(`/api/documents/${newId}/status`);
          const sdata = await s.json();
          setDocs((prev) => prev.map((d) => (d.id === newId ? { ...d, status: sdata.status === "completed" ? "extracted" : sdata.status, error: sdata.error } : d)));
          if (sdata.status === "processing") {
            setTimeout(poll, 900);
          } else if (sdata.status === "completed") {
            const dres = await fetch(`/api/documents/${newId}/data`);
            const djson = await dres.json();
            const summary = buildKeySummary(selectedType as DocType, djson.extractedData || {});
            const fields: ExtractedField[] = djson.extracted?.fields || [];
            const quality = djson.extracted?.quality as DocRecord["quality"];
            const messages: string[] = djson.extracted?.messages || [];
            setDocs((prev) => prev.map((d) => (d.id === newId ? { ...d, keySummary: summary, fields, quality, messages } : d)));
            const requiredMissing = (type: DocType) => {
              const need = manualFieldDefs(type).filter((f) => f.required).map((f) => f.name);
              const have = new Set((fields || []).map((f) => f.name));
              return need.some((n) => !have.has(n));
            };
            if (quality && quality !== "good") setEditDocId(newId);
            else if (requiredMissing(selectedType as DocType)) setEditDocId(newId);
          }
        } catch (err) {
          setDocs((prev) => prev.map((d) => (d.id === newId ? { ...d, status: "error", error: "Processing failed" } : d)));
        }
      };
      poll();
    } catch (err) {
      setDocs((prev) => prev.map((d) => (d.id === tempId ? { ...d, status: "error", error: "Upload failed" } : d)));
    } finally {
      setFile(null);
      setSelectedType("");
      (document.getElementById("doc-file-input") as HTMLInputElement | null)?.value && ((document.getElementById("doc-file-input") as HTMLInputElement).value = "");
    }
  }

  function buildKeySummary(type: DocType, extracted: any): Record<string, number | string> {
    const inc = Number(extracted?.income ?? 0);
    const ded = Number(extracted?.deductions ?? 0);
    const taxable = Number(extracted?.taxableIncome ?? 0);
    switch (type) {
      case "Form 16":
      case "Salary Slip":
        return { Salary: inc, "Taxable Income": taxable, Deductions: ded };
      case "Form 26AS/AIS":
        return { "Reported Income": inc, Deductions: ded, "Taxable Income": taxable };
      case "Bank Statement":
        return { "Interest Income (est.)": Math.max(0, taxable - (inc - ded)) };
      case "Investment Proof":
        return { "Eligible 80C (est.)": Math.min(150000, ded) };
      case "Rent Receipt":
        return { "HRA Basis (est.)": Math.max(0, ded) };
      case "Loan Statement":
        return { "Interest Paid (est.)": Math.max(0, ded) };
      case "Medical Bill":
        return { "Medical Expense (est.)": Math.max(0, ded) };
      case "Capital Gains Report":
        return { "Capital Gains (est.)": Math.max(0, inc - taxable) };
      case "Business Income Document":
        return { "Business Income (est.)": inc, "Taxable Income": taxable };
      default:
        return { Income: inc, Deductions: ded, "Taxable Income": taxable };
    }
  }

  const issues = useMemo(() => {
    const out: { message: string; action?: () => void }[] = [];
    const form16 = docs.find((d) => d.docType === "Form 16" && d.keySummary && d.status === "extracted");
    const slip = docs.find((d) => d.docType === "Salary Slip" && d.keySummary && d.status === "extracted");
    if (form16 && slip) {
      const s1 = Number(form16.keySummary?.Salary ?? 0);
      const s2 = Number(slip.keySummary?.Salary ?? 0);
      if (s1 && s2) {
        const diff = Math.abs(s1 - s2) / Math.max(s1, s2);
        if (diff > 0.02) {
          out.push({
            message: `Salary mismatch between Form 16 (₹${s1.toLocaleString()}) and Salary Slip (₹${s2.toLocaleString()}). Review and correct.`,
            action: () => onAskAI("Explain salary mismatch between Form 16 and Salary Slip, and steps to fix."),
          });
        }
      }
    }
    const f26 = docs.find((d) => d.docType === "Form 26AS/AIS" && d.status === "extracted");
    if (form16 && f26) {
      const t1 = Number((form16.keySummary as any)?.["Taxable Income"] ?? 0);
      const t2 = Number((f26.keySummary as any)?.["Taxable Income"] ?? 0);
      if (t1 && t2) {
        const diff = Math.abs(t1 - t2) / Math.max(t1, t2);
        if (diff > 0.05) {
          out.push({
            message: `Reported taxable income differs between Form 16 and 26AS/AIS. Please reconcile figures.`,
            action: () => onAskAI("Why would taxable income differ between Form 16 and 26AS/AIS?"),
          });
        }
      }
    }
    return out;
  }, [docs]);

  const [editDocId, setEditDocId] = useState<string | null>(null);
  const editDoc = docs.find((d) => d.id === editDocId) || null;
  const [editValues, setEditValues] = useState<{ [k: string]: string | number }>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const globalFields = useMemo(() => {
    const map = new Map<string, string | number>();
    const form16 = docs.find((d) => d.docType === "Form 16" && d.fields && d.status === "extracted");
    const source = form16 || docs.find((d) => d.fields && d.status === "extracted");
    if (source?.fields) {
      for (const f of source.fields) map.set(f.name, f.value);
    }
    return map;
  }, [docs]);

  function manualFieldDefs(docType: DocType): { label: string; name: string; type: "text" | "number"; required?: boolean }[] {
    const base: { label: string; name: string; type: "text" | "number"; required?: boolean }[] = [];
    if (docType === "Form 16") {
      base.push({ label: "PAN", name: "PAN", type: "text", required: true });
      base.push({ label: "Employer", name: "Employer", type: "text", required: true });
      base.push({ label: "Gross Salary", name: "Salary", type: "number", required: true });
      base.push({ label: "TDS Deducted", name: "TDS", type: "number" });
      base.push({ label: "Deductions (80C/80D etc)", name: "Deductions", type: "number" });
      base.push({ label: "Taxable Income", name: "Taxable Income", type: "number" });
    } else if (docType === "Form 26AS/AIS") {
      if (!globalFields.has("PAN")) base.push({ label: "PAN", name: "PAN", type: "text", required: true });
      base.push({ label: "TDS", name: "TDS", type: "number" });
      base.push({ label: "Taxable Income", name: "Taxable Income", type: "number" });
    } else if (docType === "Salary Slip") {
      if (!globalFields.has("PAN")) base.push({ label: "PAN", name: "PAN", type: "text" });
      if (!globalFields.has("Employer")) base.push({ label: "Employer", name: "Employer", type: "text" });
      base.push({ label: "Basic Salary", name: "Basic Salary", type: "number" });
      base.push({ label: "HRA", name: "HRA", type: "number" });
      base.push({ label: "Conveyance Allowance", name: "Conveyance Allowance", type: "number" });
      base.push({ label: "Other Allowances", name: "Other Allowances", type: "number" });
      base.push({ label: "Gross Salary", name: "Salary", type: "number", required: true });
      base.push({ label: "Deductions", name: "Deductions", type: "number" });
      base.push({ label: "Net Salary", name: "Net Salary", type: "number" });
    } else if (docType === "Bank Statement") {
      base.push({ label: "Interest Income", name: "Interest Income", type: "number", required: true });
    } else if (docType === "Investment Proof") {
      base.push({ label: "Amount Invested (80C)", name: "Eligible 80C", type: "number", required: true });
    } else if (docType === "Rent Receipt") {
      base.push({ label: "Total Rent Paid", name: "Deductions", type: "number", required: true });
    } else if (docType === "Loan Statement") {
      base.push({ label: "Interest Paid", name: "Interest Paid", type: "number", required: true });
    } else if (docType === "Medical Bill") {
      base.push({ label: "Medical Expense", name: "Medical Expense", type: "number", required: true });
    } else if (docType === "Capital Gains Report") {
      base.push({ label: "Capital Gains", name: "Capital Gains", type: "number" });
      base.push({ label: "Taxable Income", name: "Taxable Income", type: "number" });
    } else if (docType === "Business Income Document") {
      base.push({ label: "Business Income", name: "Business Income", type: "number", required: true });
      base.push({ label: "Expenses", name: "Deductions", type: "number" });
    }
    return base;
  }

  useEffect(() => {
    if (!editDoc) return;
    const defs = manualFieldDefs(editDoc.docType);
    const initial: { [k: string]: string | number } = {};
    for (const def of defs) {
      const fv = editDoc.fields?.find((f) => f.name === def.name)?.value ?? globalFields.get(def.name);
      if (fv != null) initial[def.name] = fv as any;
    }
    setEditValues(initial);
    setEditErrors({});
  }, [editDocId]);

  function validateManual(defs: ReturnType<typeof manualFieldDefs>) {
    const errs: Record<string, string> = {};
    for (const def of defs) {
      const v = editValues[def.name];
      if (def.required && (v === undefined || v === null || String(v).trim() === "")) {
        errs[def.name] = "Required";
      }
      if (def.type === "number" && v !== undefined && v !== null && String(v).trim() !== "") {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) errs[def.name] = "Enter a valid number";
      }
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function saveManualCorrections() {
    if (!editDoc) return;
    const defs = manualFieldDefs(editDoc.docType);
    if (!validateManual(defs)) return;
    const payload = {
      fields: Object.entries(editValues).map(([name, value]) => ({ name, value })),
    };
    try {
      await fetch(`/api/documents/${editDoc.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const dres = await fetch(`/api/documents/${editDoc.id}/data`);
      const djson = await dres.json();
      const summary = buildKeySummary(editDoc.docType, djson.extractedData || {});
      const fields: ExtractedField[] = djson.extracted?.fields || [];
      const quality = djson.extracted?.quality as DocRecord["quality"];
      const messages: string[] = djson.extracted?.messages || [];
      setDocs((prev) => prev.map((d) => (d.id === editDoc.id ? { ...d, keySummary: summary, fields, quality, messages } : d)));
    } finally {
      setEditDocId(null);
    }
  }

  const deductionsSummary = useMemo(() => {
    const totalDeductions = docs
      .filter((d) => d.status === "extracted")
      .reduce((sum, d) => sum + Number((d.keySummary?.Deductions as number) || 0) + Number((d.keySummary as any)?.["Eligible 80C (est.)"] || 0), 0);
    const hasInvestmentProof = docs.some((d) => d.docType === "Investment Proof");
    const max80C = 150000;
    const suggestion = totalDeductions < max80C ? `You can claim up to ₹${(max80C - totalDeductions).toLocaleString()} more under 80C.` : "80C limit appears fully utilized.";
    const missing: DocType[] = ["Investment Proof", "Medical Bill", "Rent Receipt", "Loan Statement"].filter((t) => !docs.some((d) => d.docType === t)) as DocType[];
    return { totalDeductions, suggestion, missing, hasInvestmentProof };
  }, [docs]);

  const checklist = useMemo(() => {
    return allDocTypes.map((t) => ({ type: t, uploaded: docs.some((d) => d.docType === t) }));
  }, [docs]);

  return (
    <div className={cn("space-y-8", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Upload className="w-5 h-5 mr-2" /> Upload Documents</CardTitle>
          <CardDescription>Select a type and upload PDF/JPG/PNG files. Max 10MB each.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocType)}>
                <SelectTrigger id="doc-type" aria-label="Document type">
                  <SelectValue placeholder="Choose type" />
                </SelectTrigger>
                <SelectContent>
                  {allDocTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-file-input">File</Label>
              <Input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={!file || !selectedType}>Upload</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription>
            <div className="font-medium mb-2">Cross-document validation found potential issues:</div>
            <ul className="list-disc ml-5 space-y-1">
              {issues.map((iss, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2">
                  <span>{iss.message}</span>
                  <Button size="sm" variant="outline" onClick={iss.action}>
                    <MessageCircleQuestion className="w-4 h-4 mr-1" /> Ask AI
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded files and extraction status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium flex items-center gap-2"><FileText className="w-4 h-4" /> {d.fileName} <span className="text-xs text-gray-500">({formatBytes(d.size)})</span></TableCell>
                  <TableCell>{d.docType}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell>{d.uploadedAt.toLocaleString()}</TableCell>
                  <TableCell>
                    {d.status === "extracted" ? (
                      <div className="space-y-2">
                        {d.quality && d.quality !== "good" && (
                          <Alert>
                            <AlertDescription>
                              {(d.messages && d.messages[0]) || "Extraction quality is low. Please review and correct fields or upload a clearer copy."}
                            </AlertDescription>
                          </Alert>
                        )}
                        {d.fields && d.fields.length > 0 ? (
                          <div className="text-xs grid grid-cols-1 md:grid-cols-2 gap-1">
                            {d.fields.map((f) => (
                              <div key={f.name} className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-success-600" />
                                <span>{f.name}: {typeof f.value === "number" ? `₹${(f.value as number).toLocaleString()}` : String(f.value)}</span>
                                <span className="text-[10px] text-gray-500">({Math.round(f.confidence * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        ) : d.keySummary ? (
                          <div className="text-xs space-y-1">
                            {Object.entries(d.keySummary).map(([k, v]) => (
                              <div key={k} className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-success-600" /> {k}: {typeof v === "number" ? `₹${(v as number).toLocaleString()}` : String(v)}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    ) : d.status === "error" ? (
                      <span className="text-red-600 text-sm flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {d.error}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onAskAI(`Explain how to use ${d.docType} in ITR and common mistakes.`)}>Ask AI</Button>
                      {d.status === "extracted" && (
                        <>
                          <Dialog open={editDocId === d.id} onOpenChange={(open) => setEditDocId(open ? d.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary">Enter details manually</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review and correct fields</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {["PAN", "Employer", "Salary", "TDS", "Deductions", "Taxable Income"].map((k) => (
                                  <div key={k} className="space-y-1">
                                    <Label>{k}</Label>
                                    <Input
                                      value={String(editValues[k] ?? "")}
                                      onChange={(e) => setEditValues((prev) => ({ ...prev, [k]: k === "PAN" || k === "Employer" ? e.target.value : Number(e.target.value.replace(/[^\d]/g, "")) }))}
                                      placeholder={k === "PAN" || k === "Employer" ? `Enter ${k}` : "0"}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end gap-2 mt-2">
                                <Button variant="outline" onClick={() => setEditDocId(null)}>Cancel</Button>
                                <Button onClick={saveManualCorrections}>Save</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="outline" onClick={async () => {
                            const r = await fetch(`/api/documents/${d.id}/json`);
                            if (r.ok) {
                              const json = await r.json();
                              const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${d.docType.replace(/\s+/g, "-")}-${d.id}.json`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            }
                          }}>View JSON</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onAskAI(`How to verify data extracted from ${d.docType}?`)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="w-5 h-5 mr-2" /> Deductions Summary</CardTitle>
            <CardDescription>Based on extracted investment proofs and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Estimated Deductions</div>
                <div className="text-2xl font-bold">₹{deductionsSummary.totalDeductions.toLocaleString()}</div>
                <div className="text-sm text-gray-600 mt-1">{deductionsSummary.suggestion}</div>
              </div>
              <Button variant="outline" onClick={() => onAskAI("How to maximize 80C/80D deductions based on my uploaded proofs?")}>Ask AI for tips</Button>
            </div>
            <Separator className="my-4" />
            {deductionsSummary.missing.length > 0 ? (
              <Alert>
                <AlertDescription>
                  Missing documents for full deduction claims: {deductionsSummary.missing.join(", ")}. Upload to optimize benefits.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-sm text-success-700">All key deduction-related documents are uploaded.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Required documents status</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checklist.map((c) => (
                <li key={c.type} className="flex items-center justify-between">
                  <span>{c.type}</span>
                  {c.uploaded ? (
                    <Badge className="bg-success-100 text-success-800">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary">Missing</Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
