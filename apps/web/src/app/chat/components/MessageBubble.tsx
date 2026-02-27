"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Pencil, Check, X, ArrowRight } from "lucide-react";
import { ChoiceSelector } from "./ChoiceSelector";
import { TypingIndicator } from "./TypingIndicator";
import { PriceCard } from "./PriceCard";
import { MarkdownContent } from "./MarkdownContent";
import type { PriceEstimate } from "@mismo/shared";

interface Choice {
  label: string;
  description: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isLatest?: boolean;
  choices?: Choice[] | null;
  priceEstimate?: PriceEstimate | null;
  onEdit?: (newContent: string) => void;
  onChoiceSelect?: (choice: Choice) => void;
  editDisabled?: boolean;
  showProceedPrompt?: boolean;
  onProceed?: () => void;
}

const CHOICES_REGEX = /\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/g;
const META_BLOCK_REGEX = /\[META\][\s\S]*?\[\/META\]/g;

function stripChoiceBlocks(text: string): string {
  let cleaned = text.replace(CHOICES_REGEX, "");
  cleaned = cleaned.replace(/\[CHOICES\][\s\S]*$/i, "");
  cleaned = cleaned.replace(/\[C(?:H(?:O(?:I(?:C(?:E(?:S)?)?)?)?)?)?$/i, "");
  return cleaned.trim();
}

function stripMetaBlocks(text: string): string {
  let cleaned = text.replace(META_BLOCK_REGEX, "");
  cleaned = cleaned.replace(/\[META\][\s\S]*$/, "");
  cleaned = cleaned.replace(/\[M(?:E(?:T(?:A)?)?)?$/, "");
  return cleaned.trim();
}

function detectStreamingTag(raw: string): "meta" | "choices" | null {
  if (/\[META\][\s\S]*$/.test(raw) || /\[M(?:E(?:T(?:A)?)?)?$/.test(raw))
    return "meta";
  if (
    /\[CHOICES\][\s\S]*$/i.test(raw) ||
    /\[C(?:H(?:O(?:I(?:C(?:E(?:S)?)?)?)?)?)?$/i.test(raw)
  )
    return "choices";
  return null;
}

export function MessageBubble({
  role,
  content,
  isStreaming,
  isLatest,
  choices,
  priceEstimate,
  onEdit,
  onChoiceSelect,
  editDisabled,
  showProceedPrompt,
  onProceed,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
    }
  }, [editing]);

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== content && onEdit) {
      onEdit(trimmed);
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditValue(content);
    setEditing(false);
  }

  const displayContent =
    role === "assistant"
      ? stripMetaBlocks(stripChoiceBlocks(content))
      : content;
  const isEmptyStreaming =
    role === "assistant" && content === "" && isStreaming;
  const streamingTag =
    isStreaming && role === "assistant" ? detectStreamingTag(content) : null;

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-gray-400">
          {role === "assistant" ? "Mo" : "You"}
        </p>
        {role === "user" && onEdit && !editDisabled && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"
            title="Edit message"
          >
            <Pencil size={12} className="text-gray-400" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleEditSubmit} className="space-y-2">
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-300 resize-none"
          />
          <div className="flex gap-1.5">
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              <Check size={12} />
              Save & resend
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </form>
      ) : isEmptyStreaming ? (
        <TypingIndicator />
      ) : (
        <>
          {role === "assistant" ? (
            <MarkdownContent
              content={displayContent}
              className="text-base text-gray-700"
            />
          ) : (
            <p className="text-base text-gray-900 font-medium">
              {displayContent}
            </p>
          )}

          {streamingTag && displayContent && (
            <div className="flex items-center gap-2 mt-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                {streamingTag === "choices"
                  ? "preparing options..."
                  : "finishing up..."}
              </span>
            </div>
          )}

          {priceEstimate && <PriceCard estimate={priceEstimate} />}

          {choices &&
            choices.length > 0 &&
            isLatest &&
            !isStreaming &&
            onChoiceSelect && (
              <ChoiceSelector
                choices={choices}
                onSelect={onChoiceSelect}
                disabled={editDisabled}
              />
            )}

          {showProceedPrompt && isLatest && !isStreaming && onProceed && (
            <button
              onClick={onProceed}
              className="mt-3 w-full flex items-center gap-3 px-4 py-3 text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-gray-900 rounded-lg">
                <ArrowRight size={16} className="text-white" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  Ready to move forward
                </span>
                <span className="text-xs text-gray-500">
                  We have enough information to create your project plan
                </span>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
