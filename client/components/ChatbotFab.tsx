import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const STORAGE_MESSAGES = "chatbot:messages";
const STORAGE_CONV = "chatbot:conversationId";

export default function ChatbotFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const raw = sessionStorage.getItem(STORAGE_MESSAGES);
    if (raw) {
      try { return JSON.parse(raw) as ChatMessage[]; } catch {}
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        text: "Hi! I can help explain tax fields, deductions, and next steps. How can I assist you today?",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const convRef = useRef<string | null>(sessionStorage.getItem(STORAGE_CONV));

  useEffect(() => {
    sessionStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  const quickReplies = useMemo(() => [
    "How to upload documents?",
    "Explain section 80C",
    "Where can I see processing status?",
  ], []);

  const appendLocal = (role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);
  };

  const canned = (q: string) => {
    const l = q.toLowerCase();
    if (l.includes("upload")) return "Click 'Choose Files' or drag-and-drop PDF/JPG/PNG in the Dashboard upload area.";
    if (l.includes("80c")) return "80C lets you claim deductions for investments like PPF/ELSS up to the allowed limit.";
    if (l.includes("status")) return "Open Dashboard → Uploaded Documents to view processing status.";
    return "I can help with uploads, deductions, and ITR review. Ask me anything!";
  };

  const sendToBackend = async (text: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convRef.current, message: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      convRef.current = data.conversationId;
      sessionStorage.setItem(STORAGE_CONV, convRef.current);
      const msgs: ChatMessage[] = data.messages;
      setMessages(msgs);
    } catch {
      // Fallback to canned reply
      appendLocal("assistant", canned(text));
    }
  };

  const handleSend = () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    appendLocal("user", text);
    setSending(true);
    sendToBackend(text).finally(() => setSending(false));
  };

  const handleQuick = (text: string) => {
    setInput("");
    appendLocal("user", text);
    setSending(true);
    sendToBackend(text).finally(() => setSending(false));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="rounded-full shadow-lg" aria-label="Open chatbot">
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-brand-600" />
              ITR Buddy Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="h-96 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Quick replies */}
            <div className="px-3 pb-2 flex flex-wrap gap-2 border-t bg-white/60">
              {quickReplies.map((q) => (
                <Button key={q} size="sm" variant="outline" onClick={() => handleQuick(q)}>
                  {q}
                </Button>
              ))}
            </div>

            <div className="p-3 border-t flex items-center space-x-2">
              <Input
                placeholder="Ask about taxes, deductions, forms..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <Button onClick={handleSend} aria-label="Send message" disabled={sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
