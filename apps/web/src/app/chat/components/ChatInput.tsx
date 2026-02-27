"use client";

import { useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_HEIGHT = 180;

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const clamped = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${clamped}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [value]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isStreaming && onStop) {
      onStop();
      return;
    }
    if (!value.trim() || disabled) return;
    onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming && onStop) {
        onStop();
        return;
      }
      if (!value.trim() || disabled) return;
      onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isStreaming}
        className="w-full min-h-[48px] px-5 py-3 pr-14 text-base bg-white border border-gray-200 rounded-2xl outline-none focus:border-gray-300 transition-colors disabled:opacity-50 resize-none block"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="absolute right-1.5 bottom-1.5 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center transition-opacity hover:bg-gray-800"
          title="Stop generating"
        >
          <Square size={14} fill="white" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="absolute right-1.5 bottom-1.5 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </form>
  );
}
