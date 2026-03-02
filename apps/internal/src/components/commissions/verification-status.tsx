interface VerificationCheck {
  label: string
  passed: boolean
}

interface VerificationStatusProps {
  checks: VerificationCheck[]
  errorMessage?: string | null
}

export function VerificationStatus({
  checks,
  errorMessage,
}: VerificationStatusProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex flex-wrap gap-4">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            <span
              className={`text-sm ${check.passed ? 'text-green-600' : 'text-red-600'}`}
            >
              {check.passed ? '\u2713' : '\u2717'}
            </span>
            <span className="text-xs text-gray-600">{check.label}</span>
          </div>
        ))}
      </div>
      {errorMessage && (
        <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  )
}
