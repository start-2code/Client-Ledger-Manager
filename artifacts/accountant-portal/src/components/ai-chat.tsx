import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED = [
  "How many overdue tasks are there?",
  "Which clients are VAT registered?",
  "Show me tasks assigned to each person",
  "What's the breakdown of SA tax return statuses?",
];

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Request failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            if (event.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  };
                }
                return updated;
              });
            }
            if (event.done || event.error) break;
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, something went wrong. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="h-4 w-4" />
        Ask AI
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl transition-all duration-300",
          "w-[420px] max-w-[calc(100vw-3rem)]",
          open ? "h-[580px] max-h-[calc(100vh-5rem)] opacity-100 scale-100" : "h-0 opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">ClearBooks AI</div>
            <div className="text-xs text-muted-foreground">Ask anything about your practice data</div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleClose}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
                    Hi! I have access to your full practice database — clients, tasks, tax returns, and financial info. What would you like to know?
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground px-1">Try asking:</p>
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={streaming}
                      className="block w-full text-left rounded-xl border bg-background px-3.5 py-2 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted text-foreground"
                  )}
                >
                  {msg.content}
                  {msg.role === "assistant" && streaming && i === messages.length - 1 && msg.content === "" && (
                    <span className="inline-flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-3 shrink-0">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about clients, tasks, tax returns..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
              rows={1}
              disabled={streaming}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Powered by Gemini · Data refreshed on each message
          </p>
        </div>
      </div>
    </>
  );
}
