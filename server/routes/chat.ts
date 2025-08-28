import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

type Msg = { id: string; role: "user" | "assistant"; text: string; ts: number };
const conversations = new Map<string, Msg[]>();

import { getAllDocs } from "./documents";

function buildUserContext(userId: string) {
  const docs = getAllDocs().filter((d) => d.userId === userId && d.status !== "error");
  if (!docs.length) return "No uploaded docs in context.";
  const parts = docs.map((d) => {
    const sum = d.extracted?.summary;
    const fields = d.extracted?.fields?.slice(0, 8)?.map((f) => `${f.name}: ${f.value} (${Math.round(f.confidence * 100)}%)`).join(", ") || "";
    return `• ${d.docTypeLabel || d.name} – status: ${d.status}${sum ? ` | income: ${sum.income}, deductions: ${sum.deductions}, taxable: ${sum.taxableIncome}` : ""}${fields ? ` | fields: ${fields}` : ""}`;
  });
  return parts.join("\n");
}

function replyFor(input: string, userId = "dev-user"): string {
  const q = input.toLowerCase();
  const ctx = buildUserContext(userId);
  if (q.includes("upload")) {
    return `**Upload Help** 📄\n\nClick 'Choose Files' or drag-and-drop PDF/JPG/PNG. Max 10MB each.\n\n_Current docs in context:_\n${ctx}`;
  }
  if (q.includes("80c")) {
    return `**80C Basics** 💡\n\nYou can claim eligible investments (PPF/ELSS/LIC etc.) up to the limit.\n\n_Context snapshot:_\n${ctx}`;
  }
  if (q.includes("status")) {
    return `**Processing Status** ⏱️\n\nCheck Dashboard → Uploaded Documents.\n\n_Current context:_\n${ctx}`;
  }
  return `**How I can help** 🤝\n- Uploads & extraction\n- Deductions & sections\n- ITR review & validation\n\n_Current context:_\n${ctx}`;
}

router.post("/", (req: Request, res: Response) => {
  const { conversationId, message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  const id = conversationId || randomUUID();
  const history = conversations.get(id) || [];
  const userMsg: Msg = { id: randomUUID(), role: "user", text: message, ts: Date.now() };
  history.push(userMsg);
  const text = replyFor(message);
  const bot: Msg = { id: randomUUID(), role: "assistant", text, ts: Date.now() };
  history.push(bot);
  conversations.set(id, history);
  return res.json({ conversationId: id, reply: text, messages: history });
});

// SSE streaming using OpenRouter if API key provided
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const canned = replyFor(q, "dev-user");
    const bot = { id: randomUUID(), role: "assistant" as const, text: canned, ts: Date.now() };
    history.push(bot);
    conversations.set(conversationId, history);
    res.write(`data: ${JSON.stringify({ delta: canned, done: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const userId = "dev-user";
    const userCtx = buildUserContext(userId);
    const messages = [
      { role: "system", content: "You are ITR Buddy, a helpful tax assistant for Indian income taxes. Format replies with Markdown. Use emojis where helpful (🎉, ⚠️, 💡). Be concise and professional." },
      { role: "system", content: `User context (docs & extracted data):\n${userCtx}` },
      ...history.map((m) => ({ role: m.role, content: m.text })),
    ];

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Upstream error ${upstream.status}`);
    }

    const reader = upstream.body.getReader();
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
    history.push({ id: randomUUID(), role: "assistant", text: assistantText, ts: Date.now() });
    conversations.set(conversationId, history);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: "stream-failed" })}\n\n`);
    res.end();
  }
});

export default router;
