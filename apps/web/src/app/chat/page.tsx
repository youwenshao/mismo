"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { ArrowUp, Mic, MessageSquare } from "lucide-react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "text" | "voice";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);

    try {
      let ctx = context;
      if (!ctx) {
        const startRes = await fetch("/api/interview/start", { method: "POST" });
        if (!startRes.ok) throw new Error("Failed to start session");
        const startData = await startRes.json();
        ctx = startData.state;
        setContext(ctx);
      }

      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: ctx }),
      });

      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const ctxHeader = res.headers.get("X-Interview-Context");
      let updatedCtx = ctx;
      if (ctxHeader) {
        try {
          updatedCtx = JSON.parse(ctxHeader);
        } catch {
          // header parse failed, keep previous context
        }
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        const snapshot = fullText;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      }

      // Append assistant message to context so the server has full history
      if (updatedCtx && typeof updatedCtx === "object") {
        const ctxMsgs = Array.isArray(
          (updatedCtx as Record<string, unknown>).messages,
        )
          ? ((updatedCtx as Record<string, unknown>).messages as unknown[])
          : [];
        setContext({
          ...updatedCtx,
          messages: [
            ...ctxMsgs,
            {
              role: "assistant",
              content: fullText,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } else {
        setContext(updatedCtx);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  const hasMessages = messages.length > 0;

  function ModeToggle() {
    return (
      <div className="flex justify-center gap-1 mt-3">
        <button
          onClick={() => setMode("text")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors ${
            mode === "text"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <MessageSquare size={12} />
          Text
        </button>
        <button
          onClick={() => setMode("voice")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors ${
            mode === "voice"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Mic size={12} />
          Voice
        </button>
      </div>
    );
  }

  function ChatInput() {
    return (
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isStreaming}
          className="w-full px-5 py-3 pr-14 text-base bg-white border border-gray-200 rounded-2xl outline-none focus:border-gray-300 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Mismo
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          back to dashboard
        </Link>
      </header>

      {mode === "voice" ? (
        <>
          <div className="flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() =>
                alert("Voice mode requires LiveKit configuration")
              }
              className="w-32 h-32 rounded-full bg-gray-100 animate-pulse mb-4"
            />
            <p className="text-sm text-gray-400">Tap to speak</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3">
            <ModeToggle />
          </div>
        </>
      ) : !hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
          <h1 className="text-3xl font-semibold text-center mb-8">
            What can I help you build?
          </h1>
          <div className="w-full max-w-2xl">
            <ChatInput />
            <ModeToggle />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="max-w-2xl mx-auto space-y-6 py-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-400 mb-1">
                    {msg.role === "assistant" ? "Mo" : "You"}
                  </p>
                  {msg.role === "assistant" &&
                  msg.content === "" &&
                  isStreaming ? (
                    <TypingIndicator />
                  ) : (
                    <p
                      className={
                        msg.role === "assistant"
                          ? "text-base text-gray-700 whitespace-pre-wrap"
                          : "text-base text-gray-900 font-medium"
                      }
                    >
                      {msg.content}
                    </p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3">
            <ChatInput />
            <ModeToggle />
          </div>
        </>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 py-1">
      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
