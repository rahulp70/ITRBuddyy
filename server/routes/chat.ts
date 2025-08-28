import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

type Msg = { id: string; role: "user" | "assistant"; text: string; ts: number };
const conversations = new Map<string, Msg[]>();

function replyFor(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("upload")) {
    return "To upload documents, click 'Choose Files' or drag-and-drop PDFs/JPG/PNG. Max 10MB each.";
  }
  if (q.includes("80c")) {
    return "Section 80C allows deductions up to the limit for investments like PPF, ELSS, and certain expenses.";
  }
  if (q.includes("status")) {
    return "You can view processing status in your Dashboard under 'Uploaded Documents'.";
  }
  return "I can help with uploads, deductions, and ITR review. Ask me anything!";
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

export default router;
