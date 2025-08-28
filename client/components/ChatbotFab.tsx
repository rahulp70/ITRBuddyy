import { useState } from "react";
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

export default function ChatbotFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I can help explain tax fields, deductions, and next steps. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = { id: `${Date.now()}`, role: "user", text: input.trim() };
    setMessages((prev) => [...prev, newMsg, { id: `${Date.now()}-a`, role: "assistant", text: "Thanks! Isimulate AI here. A real assistant can be connected later." }]);
    setInput("");
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
          <div className="h-80 flex flex-col">
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
            <div className="p-3 border-t flex items-center space-x-2">
              <Input
                placeholder="Ask about taxes, deductions, forms..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <Button onClick={handleSend} aria-label="Send message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
