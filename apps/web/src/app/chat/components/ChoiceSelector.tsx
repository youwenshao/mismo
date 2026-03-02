'use client'

interface Choice {
  label: string
  description: string
}

interface ChoiceSelectorProps {
  choices: Choice[]
  onSelect: (choice: Choice) => void
  disabled?: boolean
}

export function ChoiceSelector({ choices, onSelect, disabled }: ChoiceSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {choices.map((choice) => (
        <button
          key={choice.label}
          onClick={() => onSelect(choice)}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 rounded-md text-xs font-semibold text-gray-600">
            {choice.label}
          </span>
          <span className="text-gray-700">{choice.description}</span>
        </button>
      ))}
    </div>
  )
}
