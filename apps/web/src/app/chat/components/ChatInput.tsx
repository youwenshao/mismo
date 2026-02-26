"use client";

import { useRef, type FormEvent } from "react";
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

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isStreaming && onStop) {
      onStop();
      return;
    }
    if (!value.trim() || disabled) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isStreaming}
        className="w-full px-5 py-3 pr-14 text-base bg-white border border-gray-200 rounded-2xl outline-none focus:border-gray-300 transition-colors disabled:opacity-50"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center transition-opacity hover:bg-gray-800"
          title="Stop generating"
        >
          <Square size={14} fill="white" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </form>
  );
}
