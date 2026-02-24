"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface InterviewContext {
  currentState: string;
  extractedData: Record<string, unknown>;
  turnCount: number;
  totalTurnCount: number;
  messages: { role: string; content: string; timestamp: string }[];
  startedAt: string;
  expiresAt: string;
}

const STATE_LABELS: Record<string, string> = {
  GREETING: "Getting Started",
  PROBLEM_DEFINITION: "Defining the Problem",
  TARGET_USERS: "Identifying Users",
  FEATURE_EXTRACTION: "Mapping Features",
  TECHNICAL_TRADEOFFS: "Technical Decisions",
  MONETIZATION: "Business Model",
  COMPLIANCE_CHECK: "Compliance Review",
  SUMMARY: "Review & Confirm",
  COMPLETE: "Complete",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [context, setContext] = useState<InterviewContext | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isStreaming]);

  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/interview/start", { method: "POST" });
      const data = await res.json();
      setContext(data.state);
      setSessionStarted(true);

      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content:
            "Hi! I'm Mo, your AI product consultant at Mismo. I'll help you turn your idea into a detailed product specification in about 15 minutes. Let's start — what problem are you trying to solve, and what would you like to build?",
        },
      ]);
    } catch {
      setError("Failed to start interview session. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (!sessionStarted) {
      startSession();
    }
  }, [sessionStarted, startSession]);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming || !context) return;

    setError(null);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Something went wrong");
        setIsStreaming(false);
        return;
      }

      const ctxHeader = res.headers.get("X-Interview-Context");
      if (ctxHeader) {
        try {
          setContext(JSON.parse(ctxHeader));
        } catch {
          // context update failed silently
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setIsStreaming(false);
        return;
      }

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        const captured = fullText;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: captured } : m
          )
        );
      }
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  const currentPhase = context?.currentState
    ? STATE_LABELS[context.currentState] || context.currentState
    : "Starting...";

  const timeRemaining = context?.expiresAt
    ? Math.max(
        0,
        Math.floor(
          (new Date(context.expiresAt).getTime() - Date.now()) / 1000 / 60
        )
      )
    : 15;

  return (
    <div className="flex h-dvh flex-col bg-gray-50 font-sans dark:bg-gray-950">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Back to home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              M
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                Mo &mdash; Your AI Consultant
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isStreaming ? "Typing…" : currentPhase}
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {timeRemaining} min remaining
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md bg-indigo-600 text-white"
                    : "rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-white/10"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isStreaming &&
            messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-white/10">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
            aria-label="Voice input (coming soon)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              context?.currentState === "COMPLETE"
                ? "Interview complete!"
                : "Describe your product idea…"
            }
            disabled={context?.currentState === "COMPLETE"}
            className="h-10 flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-white/15 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={
              !input.trim() ||
              isStreaming ||
              context?.currentState === "COMPLETE"
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
