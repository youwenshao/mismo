"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Pencil, Check, X } from "lucide-react";
import { ChoiceSelector } from "./ChoiceSelector";
import { TypingIndicator } from "./TypingIndicator";
import { PriceCard } from "./PriceCard";
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
}

const CHOICES_REGEX = /\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/g;

function stripChoiceBlocks(text: string): string {
  return text.replace(CHOICES_REGEX, "").trim();
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
    role === "assistant" ? stripChoiceBlocks(content) : content;
  const isEmptyStreaming =
    role === "assistant" && content === "" && isStreaming;

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
          <p
            className={
              role === "assistant"
                ? "text-base text-gray-700 whitespace-pre-wrap"
                : "text-base text-gray-900 font-medium"
            }
          >
            {displayContent}
          </p>

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
        </>
      )}
    </div>
  );
}
