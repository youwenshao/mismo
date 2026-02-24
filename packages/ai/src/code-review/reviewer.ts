import { scanForSecrets, type SecretMatch } from './secret-scanner'
import { detectNPlusOneQueries, type N1QueryMatch } from './n-plus-one-detector'
import { detectRaceConditions, type RaceConditionMatch } from './race-condition-detector'

export interface CodeReviewResult {
  secrets: SecretMatch[]
  nPlusOneQueries: N1QueryMatch[]
  raceConditions: RaceConditionMatch[]
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  passesAutomatedChecks: boolean
}

function computeOverallRisk(
  secrets: SecretMatch[],
  nPlusOneQueries: N1QueryMatch[],
  raceConditions: RaceConditionMatch[],
): 'low' | 'medium' | 'high' | 'critical' {
  if (secrets.some((s) => s.severity === 'critical')) return 'critical'
  if (secrets.some((s) => s.severity === 'high')) return 'high'
  if (secrets.length > 0) return 'medium'

  const issueCount = nPlusOneQueries.length + raceConditions.length
  if (issueCount >= 5) return 'high'
  if (issueCount >= 2) return 'medium'
  if (issueCount >= 1) return 'medium'

  return 'low'
}

function buildSummary(
  secrets: SecretMatch[],
  nPlusOneQueries: N1QueryMatch[],
  raceConditions: RaceConditionMatch[],
  risk: string,
): string {
  const parts: string[] = []

  if (secrets.length > 0) {
    const critical = secrets.filter((s) => s.severity === 'critical').length
    const high = secrets.filter((s) => s.severity === 'high').length
    parts.push(
      `${secrets.length} secret(s) detected${critical ? ` (${critical} critical)` : ''}${high ? ` (${high} high)` : ''}`,
    )
  }

  if (nPlusOneQueries.length > 0) {
    parts.push(`${nPlusOneQueries.length} potential N+1 query issue(s)`)
  }

  if (raceConditions.length > 0) {
    parts.push(`${raceConditions.length} potential race condition(s)`)
  }

  if (parts.length === 0) {
    return 'No issues detected. Code passes all automated checks.'
  }

  return `Risk: ${risk}. Found: ${parts.join('; ')}.`
}

export function runAutomatedReview(
  files: { path: string; content: string }[],
): CodeReviewResult {
  const secrets = scanForSecrets(files)
  const nPlusOneQueries = detectNPlusOneQueries(files)
  const raceConditions = detectRaceConditions(files)

  const overallRisk = computeOverallRisk(secrets, nPlusOneQueries, raceConditions)
  const summary = buildSummary(secrets, nPlusOneQueries, raceConditions, overallRisk)

  const passesAutomatedChecks =
    overallRisk === 'low' && secrets.length === 0

  return {
    secrets,
    nPlusOneQueries,
    raceConditions,
    overallRisk,
    summary,
    passesAutomatedChecks,
  }
}
