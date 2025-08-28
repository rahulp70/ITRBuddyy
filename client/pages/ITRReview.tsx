import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { z } from "zod";
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

  const defaults: ItrFormValues = {
    income: { salary: "1200000", interest: "15000", rentalIncome: "0", otherIncome: "5000" },
    deductions: { section80C: "150000", section80D: "25000", charitableDonations: "10000" },
    investments: { ppf: "60000", elss: "40000", nps: "20000" },
    taxesPaid: { tds: "90000", advanceTax: "10000", selfAssessmentTax: "0" },
    notes: "Imported from extracted documents. Review and edit as needed.",
  };

  const form = useForm<ItrFormValues>({
    resolver: zodResolver(itrFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  const onSaveDraft = (values: ItrFormValues) => {
    try {
      const key = `itr_review_${params.documentId || "draft"}`;
      localStorage.setItem(key, JSON.stringify(values));
      toast({ title: "Draft saved", description: "You can return anytime to continue editing." });
    } catch (e) {
      toast({ title: "Save failed", description: "Couldn't save draft locally.", variant: "destructive" });
    }
  };

  const onSubmit = (values: ItrFormValues) => {
    // Simulate AI validation trigger
    toast({ title: "Submitted for AI validation", description: "We'll notify you when checks are complete." });
    // Navigate back to dashboard after short delay
    setTimeout(() => navigate("/dashboard"), 800);
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

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => onSaveDraft(form.getValues())}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button type="submit">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit for AI Validation
                  </Button>
                </div>
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
