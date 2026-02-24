import { randomUUID } from 'crypto'

export interface AuditLogEntry {
  id: string
  projectId: string
  action: string
  result: string
  reasoning: string
  timestamp: string
  classifierVersion: string
}

export function createAuditEntry(
  params: Omit<AuditLogEntry, 'id' | 'timestamp'>,
): AuditLogEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  }
}

export function formatAuditTrail(entries: AuditLogEntry[]): string {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const lines: string[] = [
    '# Safety Audit Trail',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total entries: ${sorted.length}`,
    '',
    '---',
    '',
  ]

  for (const entry of sorted) {
    lines.push(
      `## [${entry.timestamp}] ${entry.action}`,
      '',
      `- **ID:** \`${entry.id}\``,
      `- **Project:** ${entry.projectId}`,
      `- **Result:** ${entry.result}`,
      `- **Reasoning:** ${entry.reasoning}`,
      `- **Classifier:** v${entry.classifierVersion}`,
      '',
      '---',
      '',
    )
  }

  return lines.join('\n')
}
