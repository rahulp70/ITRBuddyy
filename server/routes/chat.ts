import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

type Msg = { id: string; role: "user" | "assistant"; text: string; ts: number };
const conversations = new Map<string, Msg[]>();

import { getAllDocs } from "./documents";

// --- Lightweight learning store (in-memory). Aggregates user feedback to improve answers over time.
interface LearnItem { good: number; bad: number; lastAnswer: string }
const learningStore = new Map<string, LearnItem>();
function normalizeQuery(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 240);
}
function recordFeedback(query: string, good: boolean, answer: string) {
  const key = normalizeQuery(query);
  const cur = learningStore.get(key) || { good: 0, bad: 0, lastAnswer: "" };
  if (good) cur.good += 1; else cur.bad += 1;
  if (answer && answer.length > 0) cur.lastAnswer = answer;
  learningStore.set(key, cur);
}
function getLearnedAnswer(query: string): string | null {
  const k = normalizeQuery(query);
  const item = learningStore.get(k);
  if (item && item.good >= item.bad && item.lastAnswer) return item.lastAnswer;
  return null;
}

function buildUserContext(userId: string) {
  const docs = getAllDocs().filter((d) => d.userId === userId && d.status !== "error");
  if (!docs.length) return "No uploaded docs in context.";
  const parts = docs.map((d) => {
    const sum = (d as any).extracted?.summary;
    const fields = (d as any).extracted?.fields?.slice(0, 8)?.map((f: any) => `${f.name}: ${f.value} (${Math.round(f.confidence * 100)}%)`).join(", ") || "";
    return `• ${d.docTypeLabel || d.name} – status: ${d.status}${sum ? ` | income: ${sum.income}, deductions: ${sum.deductions}, taxable: ${sum.taxableIncome}` : ""}${fields ? ` | fields: ${fields}` : ""}`;
  });
  return parts.join("\n");
}

function aggregateForTips(userId: string) {
  const docs = getAllDocs().filter((d) => d.userId === userId && (d as any).extracted);
  const findAll = (name: string) =>
    docs.flatMap((d: any) => ((d.extracted?.fields || []).filter((f: any) => f.name.toLowerCase() === name.toLowerCase()))) as { name: string; value: any }[];
  const getSum = (name: string) =>
    findAll(name).reduce((s, f) => s + (typeof f.value === "number" ? f.value : Number(f.value) || 0), 0);
  const hasDocType = (kw: RegExp) => docs.some((d: any) => kw.test((d.docTypeLabel || d.name || "").toLowerCase()));

  const salary = getSum("Salary");
  const tds = getSum("TDS");
  const taxable = docs.reduce((s: number, d: any) => s + (d.extracted?.summary.taxableIncome || 0), 0);
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

function isOutOfScope(q: string) {
  const l = q.toLowerCase();
  const banned = ["weather","sports","football","cricket score","movie","song","recipe","programming","python","javascript","stocks","crypto","politics","election","travel","game","gaming","windows","macos","iphone","android help"];
  return banned.some((w) => l.includes(w));
}

function baseSystemPrompt() {
  return (
    "You are ITR Buddy, a helpful assistant focused ONLY on: (1) this app's functionality and (2) Indian income tax filing guidance. " +
    "Strictly refuse out-of-scope topics with a short, polite message and suggest seeking relevant resources. " +
    "Use concise, friendly tone, add helpful emojis (🎯💡✅) sparingly, and format with Markdown (headings, lists, bold). " +
    "If unsure, say so and recommend checking official guidance at https://incometaxindia.gov.in. " +
    "Never fabricate figures. Use provided user context and uploaded document summaries."
  );
}

function replyFor(input: string, userId = "dev-user"): string {
  if (isOutOfScope(input)) {
    return "I can help with ITR Buddy and Indian income tax only. For this topic, please consult relevant resources or support channels.";
  }
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

// --- Non-streaming Gemini call, we will stream the final result to client in chunks
async function callGeminiSSEStream({ query, history, userContext, learned }: { query: string; history: Msg[]; userContext: string; learned: string | null }, res: Response) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return false;
  try {
    const sys = baseSystemPrompt();
    const preTips = /80c|80d|deduction|tip|save tax/i.test(query) ? generateDeductionTips("dev-user") : "";
    const learnedBlock = learned ? `\n\nPreferred guidance from past feedback (use if relevant):\n${learned}` : "";
    const prompt = [
      sys,
      `\n\nUser context (docs & extracted data):\n${userContext}`,
      preTips ? `\n\nPersonalized deduction insights:\n${preTips}` : "",
      learnedBlock,
      `\n\nConversation so far:\n${history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n")}`,
      `\n\nUser question: ${query}`,
      "\n\nRespond in Markdown."
    ].join("");

    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}` as any, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    } as any);

    if (!upstream.ok) return false;
    const j: any = await upstream.json();
    const text: string = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    if (!text) return false;

    // Stream to client in small chunks to keep UI responsive
    let i = 0;
    const chunkSize = 120;
    while (i < text.length) {
      const part = text.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ delta: part })}\n\n`);
      i += chunkSize;
      // Small delay to simulate streaming cadence
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 12));
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return text;
  } catch {
    return false;
  }
}

// --- OpenRouter streaming, with preference for open-source models as fallback
async function callOpenRouterSSE({ query, history, userContext, learned }: { query: string; history: Msg[]; userContext: string; learned: string | null }, res: Response) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return false;
  try {
    const userId = "dev-user";
    const preTips = /80c|80d|deduction|tip|save tax/i.test(query) ? generateDeductionTips(userId) : "";
    const messages = [
      { role: "system", content: baseSystemPrompt() },
      { role: "system", content: `User context (docs & extracted data):\n${userContext}` },
      preTips ? { role: "system", content: `Precomputed personalized deduction insights (use and elaborate):\n${preTips}` } : null,
      learned ? { role: "system", content: `Preferred guidance from past feedback (use if relevant):\n${learned}` } : null,
      ...history.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: query },
    ].filter(Boolean) as any[];

    // Prefer open-source models for fallback (Mistral/LLaMA). If unavailable, use a small general model.
    const modelCandidates = [
      "mistralai/mistral-7b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "nousresearch/hermes-2-pro-llama-3-8b",
      "openai/gpt-4o-mini"
    ];

    let upstream: Response | null = null as any;
    let chosen: string | null = null;
    for (const model of modelCandidates) {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, stream: true }),
      } as any);
      if (resp.ok && (resp as any).body) {
        upstream = resp as any;
        chosen = model;
        break;
      }
    }
    if (!upstream || !(upstream as any).body) return false;

    const reader = (upstream as any).body.getReader();
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
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return assistantText;
  } catch {
    return false;
  }
}

// --- Basic JSON reply endpoint (non-streaming)
router.post("/", async (req: Request, res: Response) => {
  const { conversationId, message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  const id = conversationId || randomUUID();
  const history = conversations.get(id) || [];
  const userMsg: Msg = { id: randomUUID(), role: "user", text: message, ts: Date.now() };
  history.push(userMsg);

  const userId = "dev-user";
  let text: string | null = null;
  if (isOutOfScope(message)) {
    text = "I can help with ITR Buddy and Indian income tax only. For this topic, please consult relevant resources or support channels.";
  } else {
    const learned = getLearnedAnswer(message);
    if (learned) text = learned;
    else text = replyFor(message, userId);
  }

  const bot: Msg = { id: randomUUID(), role: "assistant", text: text || replyFor(message, userId), ts: Date.now() };
  history.push(bot);
  conversations.set(id, history);
  return res.json({ conversationId: id, reply: bot.text, messages: history });
});

// --- SSE streaming endpoint with provider selection (Gemini -> OpenRouter -> Canned)
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

  // Knowledge guardrail: refuse obvious out-of-scope early
  if (isOutOfScope(q)) {
    const canned = "I can help with ITR Buddy and Indian income tax only. For this topic, please consult relevant resources or support channels.";
    history.push({ id: randomUUID(), role: "assistant", text: canned, ts: Date.now() });
    conversations.set(conversationId, history);
    res.write(`data: ${JSON.stringify({ delta: canned, done: true })}\n\n`);
    res.end();
    return;
  }

  const userId = "dev-user";
  const userCtx = buildUserContext(userId);
  const learned = getLearnedAnswer(q);

  // Try Gemini first
  const geminiText = await callGeminiSSEStream({ query: q, history, userContext: userCtx, learned }, res as any);
  if (typeof geminiText === "string" && geminiText.length > 0) {
    history.push({ id: randomUUID(), role: "assistant", text: geminiText, ts: Date.now() });
    conversations.set(conversationId, history);
    res.end();
    return;
  }

  // Fallback: OpenRouter with open-source models
  const openRouterText = await callOpenRouterSSE({ query: q, history, userContext: userCtx, learned }, res as any);
  if (typeof openRouterText === "string" && openRouterText.length > 0) {
    history.push({ id: randomUUID(), role: "assistant", text: openRouterText, ts: Date.now() });
    conversations.set(conversationId, history);
    res.end();
    return;
  }

  // Final fallback: canned reply
  const canned = replyFor(q, userId);
  history.push({ id: randomUUID(), role: "assistant", text: canned, ts: Date.now() });
  conversations.set(conversationId, history);
  res.write(`data: ${JSON.stringify({ delta: canned, done: true })}\n\n`);
  res.end();
});

// --- Feedback endpoint for dynamic learning
router.post("/feedback", (req: Request, res: Response) => {
  const { query, answer, good, comment } = req.body || {};
  if (!query || typeof query !== "string") return res.status(400).json({ error: "query required" });
  if (typeof good !== "boolean") return res.status(400).json({ error: "good must be boolean" });
  recordFeedback(query, !!good, typeof answer === "string" ? answer : "");
  return res.json({ ok: true });
});

export default router;
