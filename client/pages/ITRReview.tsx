import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Save, CheckCircle2 } from "lucide-react";

const currency = z
  .string()
  .regex(/^\d+(?:\.|,\d{3})*(?:\.\d{1,2})?$/, "Enter a valid amount")
  .transform((val) => val.replace(/,/g, ""));

const itrFormSchema = z.object({
  income: z.object({
    salary: currency,
    interest: currency,
    rentalIncome: currency,
    otherIncome: currency,
  }),
  deductions: z.object({
    section80C: currency,
    section80D: currency,
    charitableDonations: currency,
  }),
  investments: z.object({
    ppf: currency,
    elss: currency,
    nps: currency,
  }),
  taxesPaid: z.object({
    tds: currency,
    advanceTax: currency,
    selfAssessmentTax: currency,
  }),
  notes: z.string().max(1000).optional(),
});

type ItrFormValues = z.infer<typeof itrFormSchema>;

type Issue = { field: string; code: string; message: string };

function SectionLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function ITRReviewContent() {
  const navigate = useNavigate();
  const params = useParams();
  const { toast } = useToast();

  const form = useForm<ItrFormValues>({
    resolver: zodResolver(itrFormSchema),
    defaultValues: {
      income: { salary: "0", interest: "0", rentalIncome: "0", otherIncome: "0" },
      deductions: { section80C: "0", section80D: "0", charitableDonations: "0" },
      investments: { ppf: "0", elss: "0", nps: "0" },
      taxesPaid: { tds: "0", advanceTax: "0", selfAssessmentTax: "0" },
      notes: "",
    },
    mode: "onChange",
  });

  // Load form data from backend
  useEffect(() => {
    const id = params.documentId as string;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/itr/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        form.reset({
          income: {
            salary: String(data.income.salary),
            interest: String(data.income.interest),
            rentalIncome: String(data.income.rentalIncome),
            otherIncome: String(data.income.otherIncome),
          },
          deductions: {
            section80C: String(data.deductions.section80C),
            section80D: String(data.deductions.section80D),
            charitableDonations: String(data.deductions.charitableDonations),
          },
          investments: { ppf: String(data.investments.ppf), elss: String(data.investments.elss), nps: String(data.investments.nps) },
          taxesPaid: { tds: String(data.taxesPaid.tds), advanceTax: String(data.taxesPaid.advanceTax), selfAssessmentTax: String(data.taxesPaid.selfAssessmentTax) },
          notes: data.notes || "",
        });
      } catch {}
    })();
  }, [params.documentId]);

  const onSaveDraft = async (values: ItrFormValues) => {
    try {
      const id = params.documentId as string;
      const payload = {
        income: {
          salary: Number(values.income.salary),
          interest: Number(values.income.interest),
          rentalIncome: Number(values.income.rentalIncome),
          otherIncome: Number(values.income.otherIncome),
        },
        deductions: {
          section80C: Number(values.deductions.section80C),
          section80D: Number(values.deductions.section80D),
          charitableDonations: Number(values.deductions.charitableDonations),
        },
        investments: { ppf: Number(values.investments.ppf), elss: Number(values.investments.elss), nps: Number(values.investments.nps) },
        taxesPaid: { tds: Number(values.taxesPaid.tds), advanceTax: Number(values.taxesPaid.advanceTax), selfAssessmentTax: Number(values.taxesPaid.selfAssessmentTax) },
        notes: values.notes,
      };
      const res = await fetch(`/api/itr/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("save failed");
      toast({ title: "Draft saved", description: "Your changes are saved." });
    } catch (e) {
      toast({ title: "Save failed", description: "Couldn't save draft.", variant: "destructive" });
    }
  };

  const applyIssues = (issues: Issue[]) => {
    issues.forEach((iss) => {
      form.setError(iss.field as any, { type: "server", message: iss.message });
    });
  };

  const askAI = (message: string) => {
    window.dispatchEvent(new CustomEvent("chatbot:ask", { detail: { text: message } }));
  };

  const onValidate = async () => {
    const id = params.documentId as string;
    const res = await fetch(`/api/itr/${id}/validate`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    form.clearErrors();
    applyIssues(data.issues || []);
    if ((data.issues || []).length) {
      toast({ title: "Validation issues found", description: `${data.issues.length} issue(s) flagged.` });
    } else {
      toast({ title: "All good", description: "No issues detected by AI rules." });
    }
  };

  const onSubmit = async (values: ItrFormValues) => {
    await onSaveDraft(values);
    const id = params.documentId as string;
    const res = await fetch(`/api/itr/${id}/submit`, { method: "POST" });
    const data = await res.json();
    form.clearErrors();
    applyIssues(data.issues || []);
    if ((data.issues || []).length) {
      toast({ title: "Validation issues found", description: `${data.issues.length} issue(s) flagged.` });
    } else {
      toast({ title: "Submitted for AI validation", description: "We'll notify you when checks are complete." });
      setTimeout(() => navigate("/dashboard"), 800);
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ITR Form Review</h1>
          <p className="text-gray-600">Document ID: {params.documentId}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review and Edit Details</CardTitle>
            <CardDescription>
              Ensure all information is accurate. Hover the info icons to learn about common fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Income */}
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Income</h2>
                    <SectionLabel label="What counts as income?" help="Include salary, interest, rental, and any other taxable income." />
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="income.salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="income.interest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Income</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="income.rentalIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rental Income</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="income.otherIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Other Income
                            <span className="ml-2 text-xs text-gray-500">(freelance, gifts, etc.)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Deductions</h2>
                    <SectionLabel label="What is Section 80C?" help="Popular deduction for investments like PPF, ELSS up to the legal limit." />
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deductions.section80C"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section 80C</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deductions.section80D"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section 80D (Health Insurance)</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deductions.charitableDonations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Charitable Donations</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Investments */}
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Investments</h2>
                    <SectionLabel label="Tax-saving investments" help="PPF, ELSS and NPS are common investment options eligible for deductions." />
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="investments.ppf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PPF</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="investments.elss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ELSS</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="investments.nps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NPS</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Taxes Paid */}
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Taxes Paid</h2>
                    <SectionLabel label="What is TDS?" help="Tax Deducted at Source from salary or other income." />
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="taxesPaid.tds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TDS</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxesPaid.advanceTax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Tax</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxesPaid.selfAssessmentTax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Self-Assessment Tax</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Add any remarks or clarifications for the reviewer" rows={4} />
                        </FormControl>
                        <FormDescription>Optional. Max 1000 characters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onSaveDraft(form.getValues())}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button type="button" variant="outline" onClick={onValidate}>
                      Validate
                    </Button>
                  </div>
                  <Button type="submit">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit for AI Validation
                  </Button>
                </div>

                {/* AI help for first error */}
                {Object.values(form.formState.errors)[0] && (
                  <div className="text-sm text-gray-700">
                    <Button type="button" variant="link" onClick={() => askAI(`Explain: ${(Object.values(form.formState.errors)[0] as any).message}`)}>
                      Ask AI to explain this error
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ITRReview() {
  return (
    <Layout>
      <ProtectedRoute requireAuth={true}>
        <ITRReviewContent />
      </ProtectedRoute>
    </Layout>
  );
}
