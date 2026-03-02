'use client'

import { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import type { PriceEstimate } from '@mismo/shared'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Choice {
  label: string
  description: string
}

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  parsedChoices: Map<number, Choice[]>
  priceEstimates: Map<number, PriceEstimate>
  onEditMessage: (messageIndex: number, newContent: string) => void
  onChoiceSelect: (choice: Choice) => void
  editDisabled: boolean
  showProceedPrompt?: boolean
  onProceed?: () => void
}

export function MessageList({
  messages,
  isStreaming,
  parsedChoices,
  priceEstimates,
  onEditMessage,
  onChoiceSelect,
  editDisabled,
  showProceedPrompt,
  onProceed,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-6">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isLastAssistant =
            msg.role === 'assistant' &&
            (isLast || messages.slice(i + 1).every((m) => m.role === 'user'))
          const choices = parsedChoices.get(i) ?? null

          return (
            <MessageBubble
              key={`${i}-${msg.content.slice(0, 20)}`}
              role={msg.role}
              content={msg.content}
              isStreaming={isLast && isStreaming}
              isLatest={isLastAssistant}
              choices={choices}
              priceEstimate={priceEstimates.get(i) ?? null}
              onEdit={
                msg.role === 'user' ? (newContent) => onEditMessage(i, newContent) : undefined
              }
              onChoiceSelect={onChoiceSelect}
              editDisabled={editDisabled || isStreaming}
              showProceedPrompt={isLastAssistant ? showProceedPrompt : false}
              onProceed={onProceed}
            />
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
