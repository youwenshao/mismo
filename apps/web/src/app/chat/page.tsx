"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { Mic, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { ReadinessBar } from "./components/ReadinessBar";
import { SubmissionStatusPanel } from "./components/SubmissionStatusPanel";
import type { PriceEstimate } from "@mismo/shared";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "text" | "voice";

interface Choice {
  label: string;
  description: string;
}

interface ConfirmDoneEvent {
  projectId: string;
}

const CHOICES_REGEX = /\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/gi;
const META_REGEX = /\[META\]([\s\S]*?)\[\/META\]/;

function parseChoicesFromContent(
  content: string,
): Choice[] | null {
  CHOICES_REGEX.lastIndex = 0;
  const match = CHOICES_REGEX.exec(content);
  if (!match) return null;

  const lines = match[1]
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  return lines.map((line) => {
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) return { label: trimmed, description: "" };
    return {
      label: trimmed.slice(0, colonIdx).trim(),
      description: trimmed.slice(colonIdx + 1).trim(),
    };
  });
}

function stripMeta(text: string): string {
  return text.replace(META_REGEX, "").trim();
}

function parseMetadata(text: string): { readiness: number | null; phase: string | null } {
  const match = text.match(META_REGEX);
  if (!match) return { readiness: null, phase: null };
  try {
    const data = JSON.parse(match[1]);
    let readiness = null;
    if (typeof data.readiness_score === "number") readiness = data.readiness_score;
    else if (typeof data.readiness === "number") readiness = data.readiness;
    
    return { 
      readiness,
      phase: typeof data.current_phase === "string" ? data.current_phase : null 
    };
  } catch {
    return { readiness: null, phase: null };
  }
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-dvh flex items-center justify-center bg-white"><p className="text-gray-400 text-sm">Loading...</p></div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get("session");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState(0);
  const [interviewState, setInterviewState] = useState<string>("GREETING");
  const [priceEstimates, setPriceEstimates] = useState<Map<number, PriceEstimate>>(
    new Map(),
  );
  const [parsedChoices, setParsedChoices] = useState<Map<number, Choice[]>>(
    new Map(),
  );
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmStatusMessage, setConfirmStatusMessage] = useState("");
  const [confirmStreamOutput, setConfirmStreamOutput] = useState("");
  const [confirmIsDone, setConfirmIsDone] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (resumeSessionId && !sessionLoaded) {
      loadSession(resumeSessionId);
    }
  }, [resumeSessionId, sessionLoaded]);

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/interview/session/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSessionId(id);
      const ctx = data.state;
      if (ctx?.messages) {
        const msgs: Message[] = ctx.messages
          .filter((m: { role: string }) => m.role !== "system")
          .map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        setMessages(msgs);

        const newChoices = new Map<number, Choice[]>();
        msgs.forEach((msg, i) => {
          if (msg.role === "assistant") {
            const choices = parseChoicesFromContent(msg.content);
            if (choices) newChoices.set(i, choices);
          }
        });
        setParsedChoices(newChoices);
      }
      if (ctx?.readinessScore) {
        setReadiness(ctx.readinessScore);
      }
      if (ctx?.currentState) {
        setInterviewState(ctx.currentState);
      }
      if (ctx?.currentState === "COMPLETE" && !data.projectId) {
        setTimeout(() => {
          void handleConfirm();
        }, 500);
      }
      setSessionLoaded(true);
    } catch {
      // session load failed, start fresh
    }
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || isConfirming) return false;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setIsStreaming(true);
      let succeeded = false;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let sid = sessionId;
        if (!sid) {
          const startRes = await fetch("/api/interview/start", {
            method: "POST",
            signal: controller.signal,
          });
          if (!startRes.ok) throw new Error("Failed to start session");
          const startData = await startRes.json();
          sid = startData.sessionId;
          setSessionId(sid);
        }

        const res = await fetch("/api/interview/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, message: text }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const readinessHeader = res.headers.get("X-Interview-Readiness");
        if (readinessHeader) {
          const r = parseInt(readinessHeader, 10);
          if (!isNaN(r)) setReadiness(r);
        }

        const priceHeader = res.headers.get("X-Price-Estimate");

        const currentState = res.headers.get("X-Interview-State");
        if (currentState) {
          setInterviewState(currentState);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        setMessages((prev) => {
          const newIndex = prev.length;
          if (priceHeader) {
            try {
              const parsedEstimate = JSON.parse(priceHeader);
              setPriceEstimates((old) => {
                const updated = new Map(old);
                updated.set(newIndex, parsedEstimate);
                return updated;
              });
            } catch {
              // ignore parse errors
            }
          }
          return [
            ...prev,
            { role: "assistant", content: "" },
          ];
        });

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          const snapshot = fullText;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: snapshot,
            };
            return next;
          });
        }

        const meta = parseMetadata(fullText);
        if (meta.readiness !== null) setReadiness(meta.readiness);
        if (meta.phase === "complete") setInterviewState("COMPLETE");

        const cleanText = stripMeta(fullText);

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: cleanText,
          };
          return next;
        });

        const choices = parseChoicesFromContent(cleanText);

        if (choices && choices.length > 0) {
          setMessages((prev) => {
            setParsedChoices((old) => {
              const updated = new Map(old);
              updated.set(prev.length - 1, choices);
              return updated;
            });
            return prev;
          });
        }

        const finalMeta = parseMetadata(fullText);
        if (currentState === "COMPLETE" || finalMeta.phase === "complete") {
          setTimeout(() => {
            void handleConfirm();
          }, 1000);
        }

        succeeded = true;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // user stopped generation, keep partial response
        } else {
          console.error("Chat error:", err);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Something went wrong. Please try again.",
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
      return succeeded;
    },
    [isConfirming, isStreaming, sessionId],
  );

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handleSubmit() {
    void sendMessage(input);
  }

  async function handleConfirm() {
    if (!sessionId || isConfirming) return;
    setIsConfirming(true);
    setConfirmStatusMessage("Reviewing what we discussed so far...");
    setConfirmStreamOutput("");
    setConfirmIsDone(false);
    let shouldKeepPanel = false;
    try {
      const res = await fetch(
        `/api/interview/session/${sessionId}/confirm`,
        { method: "POST" },
      );
      if (!res.ok || !res.body) throw new Error("Confirmation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneEvent: ConfirmDoneEvent | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const lineBreak = buffer.indexOf("\n");
          if (lineBreak === -1) break;
          const line = buffer.slice(0, lineBreak).trim();
          buffer = buffer.slice(lineBreak + 1);
          if (!line) continue;

          const event = JSON.parse(line) as {
            type?: string;
            message?: string;
            text?: string;
            projectId?: string;
          };

          if (event.type === "status" && event.message) {
            setConfirmStatusMessage(event.message);
            continue;
          }

          if (event.type === "delta" && event.text) {
            setConfirmStreamOutput((prev) => prev + event.text);
            continue;
          }

          if (event.type === "error") {
            throw new Error(
              event.message ||
                "I hit a snag while preparing your project plan. Please try again.",
            );
          }

          if (event.type === "done" && event.projectId) {
            doneEvent = { projectId: event.projectId };
            setConfirmIsDone(true);
            setConfirmStatusMessage("Your project plan is ready. Taking you there now...");
          }
        }
      }

      if (!doneEvent) {
        throw new Error("Project submission did not complete");
      }
      const projectId = doneEvent.projectId;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Your project has been submitted! Our engineering team will review your specification within 24 hours.\n\nYou can track your project's progress in your dashboard.",
        },
      ]);
      setPriceEstimates(new Map());
      shouldKeepPanel = true;
      setTimeout(() => {
        setIsConfirming(false);
        window.location.href = `/project/${projectId}`;
      }, 1200);
    } catch (err) {
      console.error("Confirm error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong submitting your project. Please try again.",
        },
      ]);
      setConfirmStatusMessage("");
      setConfirmStreamOutput("");
    } finally {
      if (!shouldKeepPanel) {
        setIsConfirming(false);
      }
    }
  }

  async function handleChoiceSelect(choice: Choice) {
    await sendMessage(`${choice.label}: ${choice.description}`);
  }

  async function handleEditMessage(messageIndex: number, newContent: string) {
    if (!sessionId || isStreaming) return;

    const checkpointIndex = Math.floor(messageIndex / 2);

    try {
      const res = await fetch(
        `/api/interview/session/${sessionId}/rewind`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkpointIndex }),
        },
      );

      if (!res.ok) throw new Error("Rewind failed");

      const data = await res.json();
      const msgs: Message[] = data.messages
        .filter((m: { role: string }) => m.role !== "system")
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      setMessages(msgs);

      if (data.state?.readinessScore) {
        setReadiness(data.state.readinessScore);
      }
      if (data.state?.currentState) {
        setInterviewState(data.state.currentState);
      }

      setParsedChoices((old) => {
        const updated = new Map();
        for (const [k, v] of old.entries()) {
          if (k < msgs.length) updated.set(k, v);
        }
        return updated;
      });

      setPriceEstimates((old) => {
        const updated = new Map();
        for (const [k, v] of old.entries()) {
          if (k < msgs.length) updated.set(k, v);
        }
        return updated;
      });

      await sendMessage(newContent);
    } catch (err) {
      console.error("Edit failed:", err);
    }
  }

  const isEarlyPhase = !["SUMMARY", "FEASIBILITY_AND_PRICING", "CONFIRMATION", "COMPLETE"].includes(interviewState);
  const showProceedPrompt = readiness >= 85 && isEarlyPhase && !isStreaming && !isConfirming;

  function handleProceed() {
    void sendMessage("Proceed to summary: We have enough information to wrap up");
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="h-dvh flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 bg-white/80 backdrop-blur-md z-50"
        style={{
          maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
        }}
      >
        <div className="w-32">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Mismo
          </Link>
        </div>
        
        <div className="flex-1 max-w-md px-8">
          {hasMessages && <ReadinessBar score={readiness} />}
        </div>

        <div className="w-32 text-right">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            back to dashboard
          </Link>
        </div>
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
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </>
      ) : !hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
          <h1 className="text-3xl font-semibold text-center mb-8">
            What can I help you build?
          </h1>
          <div className="w-full max-w-2xl">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onStop={handleStop}
              isStreaming={isStreaming}
              disabled={isConfirming}
            />
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            parsedChoices={parsedChoices}
            priceEstimates={priceEstimates}
            onEditMessage={handleEditMessage}
            onChoiceSelect={handleChoiceSelect}
            editDisabled={isStreaming || isConfirming}
            showProceedPrompt={showProceedPrompt}
            onProceed={handleProceed}
          />
          <div className="shrink-0 px-4 py-3">
            {isConfirming && confirmStatusMessage && (
              <div className="max-w-2xl mx-auto">
                <SubmissionStatusPanel
                  statusMessage={confirmStatusMessage}
                  streamOutput={confirmStreamOutput}
                  isDone={confirmIsDone}
                />
              </div>
            )}
            <div className="border-t border-gray-100 pt-3">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                onStop={handleStop}
                isStreaming={isStreaming}
                disabled={isConfirming}
              />
              <ModeToggle mode={mode} setMode={setMode} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
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
