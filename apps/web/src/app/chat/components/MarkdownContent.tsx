'use client'

import ReactMarkdown, { type Components } from 'react-markdown'

interface MarkdownContentProps {
  content: string
  className?: string
  inline?: boolean
}

const blockComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
  h1: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  h2: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  h3: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  h4: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  h5: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  h6: ({ children }) => <p className="mb-2 last:mb-0 font-semibold text-gray-900">{children}</p>,
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <span>{children}</span>,
  hr: () => null,
  img: () => null,
  table: ({ children }) => <span>{children}</span>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="underline text-gray-700 hover:text-gray-900"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

const inlineComponents: Components = {
  ...blockComponents,
  p: ({ children }) => <span>{children}</span>,
}

export function MarkdownContent({ content, className, inline = false }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown components={inline ? inlineComponents : blockComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
