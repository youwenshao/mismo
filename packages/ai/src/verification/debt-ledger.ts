import { TECHNICAL_DEBT_LEVELS } from '@mismo/shared'

export interface TechnicalDebtItem {
  id: string
  level: 'L1' | 'L2' | 'L3'
  category: string
  description: string
  impact: string
  remediation: string
  estimatedEffort: string
}

export interface DebtLedger {
  projectId: string
  items: TechnicalDebtItem[]
  summary: { l1Count: number; l2Count: number; l3Count: number; overallScore: string }
  generatedAt: string
}

function generateMockItems(): TechnicalDebtItem[] {
  return [
    {
      id: 'debt-l1-01',
      level: 'L1',
      category: TECHNICAL_DEBT_LEVELS.L1,
      description: 'Inconsistent naming conventions in utility functions',
      impact: 'Reduced code readability for future maintainers',
      remediation: 'Apply consistent camelCase naming across all utility modules',
      estimatedEffort: '2 hours',
    },
    {
      id: 'debt-l1-02',
      level: 'L1',
      category: TECHNICAL_DEBT_LEVELS.L1,
      description: 'Missing JSDoc comments on public API functions',
      impact: 'Developer experience degraded when consuming the API',
      remediation: 'Add JSDoc comments with parameter descriptions and return types',
      estimatedEffort: '3 hours',
    },
    {
      id: 'debt-l2-01',
      level: 'L2',
      category: TECHNICAL_DEBT_LEVELS.L2,
      description: 'N+1 query pattern in project listing endpoint',
      impact: 'Response time degrades linearly with number of projects',
      remediation: 'Batch queries using JOIN or DataLoader pattern',
      estimatedEffort: '4 hours',
    },
    {
      id: 'debt-l2-02',
      level: 'L2',
      category: TECHNICAL_DEBT_LEVELS.L2,
      description: 'Unoptimized image assets served without CDN caching',
      impact: 'Increased page load time by ~800ms on 3G connections',
      remediation: 'Integrate next/image with proper sizing and enable CDN caching headers',
      estimatedEffort: '3 hours',
    },
    {
      id: 'debt-l3-01',
      level: 'L3',
      category: TECHNICAL_DEBT_LEVELS.L3,
      description: 'Monolithic API handler mixing business logic with HTTP concerns',
      impact: 'Difficult to test and maintain; changes risk cascading failures',
      remediation: 'Extract service layer and adopt hexagonal architecture for core domain',
      estimatedEffort: '2 days',
    },
    {
      id: 'debt-l3-02',
      level: 'L3',
      category: TECHNICAL_DEBT_LEVELS.L3,
      description: 'Direct database access from components without repository abstraction',
      impact: 'Tight coupling prevents database migration or testing with mocks',
      remediation: 'Introduce repository pattern with interface-based dependency injection',
      estimatedEffort: '3 days',
    },
  ]
}

function scoreFromCounts(l1: number, l2: number, l3: number): string {
  const weighted = l1 * 1 + l2 * 3 + l3 * 10
  if (weighted === 0) return 'A+'
  if (weighted <= 5) return 'A'
  if (weighted <= 15) return 'B'
  if (weighted <= 30) return 'C'
  return 'D'
}

export function generateDebtLedger(projectId: string, _codeReviewResult?: unknown): DebtLedger {
  const items = generateMockItems()

  const l1Count = items.filter((i) => i.level === 'L1').length
  const l2Count = items.filter((i) => i.level === 'L2').length
  const l3Count = items.filter((i) => i.level === 'L3').length

  return {
    projectId,
    items,
    summary: {
      l1Count,
      l2Count,
      l3Count,
      overallScore: scoreFromCounts(l1Count, l2Count, l3Count),
    },
    generatedAt: new Date().toISOString(),
  }
}

export function formatDebtReport(ledger: DebtLedger): string {
  const lines: string[] = [
    `# Technical Debt Ledger — Project ${ledger.projectId}`,
    `Generated: ${ledger.generatedAt}`,
    '',
    `## Summary`,
    `- L1 (${TECHNICAL_DEBT_LEVELS.L1}): ${ledger.summary.l1Count}`,
    `- L2 (${TECHNICAL_DEBT_LEVELS.L2}): ${ledger.summary.l2Count}`,
    `- L3 (${TECHNICAL_DEBT_LEVELS.L3}): ${ledger.summary.l3Count}`,
    `- Overall Score: **${ledger.summary.overallScore}**`,
    '',
    `## Items`,
  ]

  for (const item of ledger.items) {
    lines.push(
      '',
      `### [${item.level}] ${item.description}`,
      `- **Category:** ${item.category}`,
      `- **Impact:** ${item.impact}`,
      `- **Remediation:** ${item.remediation}`,
      `- **Estimated Effort:** ${item.estimatedEffort}`,
    )
  }

  return lines.join('\n')
}
