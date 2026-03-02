export type ProjectTier = 'Starter' | 'Pro' | 'Enterprise'
export type ProjectStatus =
  | 'Discovery'
  | 'Spec Review'
  | 'Development'
  | 'Code Review'
  | 'Testing'
  | 'Completed'
export type ReviewType = 'Spec' | 'Code' | 'Security'
export type ReviewStatus = 'Pending' | 'In Review' | 'Completed'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

export interface Project {
  id: string
  name: string
  client: string
  tier: ProjectTier
  status: ProjectStatus
  safetyScore: number
  createdAt: string
  tokensUsed: number
  tokenBudget: number
  description: string
}

export interface ReviewTask {
  id: string
  projectId: string
  projectName: string
  client: string
  reviewType: ReviewType
  priority: Priority
  status: ReviewStatus
  slaDeadline: string
  assignee: string | null
}

export interface BuildLog {
  id: string
  projectId: string
  timestamp: string
  message: string
  status: 'success' | 'error' | 'info' | 'warning'
}

export interface ActivityItem {
  id: string
  message: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'TaskFlow',
    client: 'Acme Corp',
    tier: 'Enterprise',
    status: 'Development',
    safetyScore: 92,
    createdAt: '2026-02-18T09:00:00Z',
    tokensUsed: 45000,
    tokenBudget: 100000,
    description:
      'A task management platform with real-time collaboration features, Kanban boards, and automated workflow triggers.',
  },
  {
    id: 'proj-002',
    name: 'PetConnect',
    client: 'Happy Paws LLC',
    tier: 'Pro',
    status: 'Code Review',
    safetyScore: 88,
    createdAt: '2026-02-15T14:30:00Z',
    tokensUsed: 72000,
    tokenBudget: 80000,
    description:
      'Pet adoption marketplace connecting shelters with potential adopters, including vet record integration and messaging.',
  },
  {
    id: 'proj-003',
    name: 'InvoiceNinja',
    client: 'FinBook Inc',
    tier: 'Starter',
    status: 'Spec Review',
    safetyScore: 95,
    createdAt: '2026-02-22T11:00:00Z',
    tokensUsed: 8500,
    tokenBudget: 30000,
    description:
      'Automated invoicing and expense tracking tool for freelancers with Stripe integration and tax estimation.',
  },
  {
    id: 'proj-004',
    name: 'FitTrack Pro',
    client: 'GymWorks',
    tier: 'Pro',
    status: 'Completed',
    safetyScore: 91,
    createdAt: '2026-02-10T08:00:00Z',
    tokensUsed: 65000,
    tokenBudget: 80000,
    description:
      'Fitness tracking app with workout builder, progress analytics, and social challenges for gym members.',
  },
  {
    id: 'proj-005',
    name: 'EduPortal',
    client: 'BrightLearn',
    tier: 'Enterprise',
    status: 'Testing',
    safetyScore: 86,
    createdAt: '2026-02-12T16:00:00Z',
    tokensUsed: 91000,
    tokenBudget: 120000,
    description:
      'Learning management system with course builder, student progress dashboards, and video hosting integration.',
  },
  {
    id: 'proj-006',
    name: 'QuickMenu',
    client: 'FoodHub',
    tier: 'Starter',
    status: 'Discovery',
    safetyScore: 97,
    createdAt: '2026-02-23T10:00:00Z',
    tokensUsed: 1200,
    tokenBudget: 30000,
    description:
      'Digital menu and ordering system for restaurants with QR code scanning and kitchen display integration.',
  },
]

const now = new Date('2026-02-24T14:00:00Z')

export const mockReviewTasks: ReviewTask[] = [
  {
    id: 'rev-001',
    projectId: 'proj-003',
    projectName: 'InvoiceNinja',
    client: 'FinBook Inc',
    reviewType: 'Spec',
    priority: 'Critical',
    status: 'Pending',
    slaDeadline: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
    assignee: null,
  },
  {
    id: 'rev-002',
    projectId: 'proj-002',
    projectName: 'PetConnect',
    client: 'Happy Paws LLC',
    reviewType: 'Code',
    priority: 'High',
    status: 'In Review',
    slaDeadline: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah K.',
  },
  {
    id: 'rev-003',
    projectId: 'proj-001',
    projectName: 'TaskFlow',
    client: 'Acme Corp',
    reviewType: 'Security',
    priority: 'High',
    status: 'Pending',
    slaDeadline: new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString(),
    assignee: null,
  },
  {
    id: 'rev-004',
    projectId: 'proj-005',
    projectName: 'EduPortal',
    client: 'BrightLearn',
    reviewType: 'Code',
    priority: 'Medium',
    status: 'Pending',
    slaDeadline: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    assignee: null,
  },
  {
    id: 'rev-005',
    projectId: 'proj-004',
    projectName: 'FitTrack Pro',
    client: 'GymWorks',
    reviewType: 'Spec',
    priority: 'Low',
    status: 'Completed',
    slaDeadline: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    assignee: 'Mike R.',
  },
]

export const mockBuildLogs: BuildLog[] = [
  {
    id: 'log-001',
    projectId: 'proj-001',
    timestamp: '2026-02-24T13:45:00Z',
    message: 'Deployed auth module to staging',
    status: 'success',
  },
  {
    id: 'log-002',
    projectId: 'proj-001',
    timestamp: '2026-02-24T13:30:00Z',
    message: 'Running integration tests — 48/52 passed',
    status: 'warning',
  },
  {
    id: 'log-003',
    projectId: 'proj-001',
    timestamp: '2026-02-24T12:15:00Z',
    message: 'Database migration applied: add_workflow_triggers',
    status: 'info',
  },
  {
    id: 'log-004',
    projectId: 'proj-001',
    timestamp: '2026-02-24T11:00:00Z',
    message: 'Build failed: TypeScript compilation error in kanban.tsx',
    status: 'error',
  },
  {
    id: 'log-005',
    projectId: 'proj-001',
    timestamp: '2026-02-24T10:30:00Z',
    message: 'AI code generation completed for task-board component',
    status: 'success',
  },
  {
    id: 'log-006',
    projectId: 'proj-002',
    timestamp: '2026-02-24T09:00:00Z',
    message: 'Security scan completed — no vulnerabilities found',
    status: 'success',
  },
  {
    id: 'log-007',
    projectId: 'proj-002',
    timestamp: '2026-02-23T17:30:00Z',
    message: 'Deployed messaging module to production',
    status: 'success',
  },
  {
    id: 'log-008',
    projectId: 'proj-005',
    timestamp: '2026-02-24T08:00:00Z',
    message: 'E2E test suite: 127/130 passing',
    status: 'warning',
  },
]

export const mockActivityFeed: ActivityItem[] = [
  {
    id: 'act-001',
    message: "Project 'TaskFlow' moved to Development",
    timestamp: '2026-02-24T13:50:00Z',
    type: 'info',
  },
  {
    id: 'act-002',
    message: "Code review completed for 'PetConnect'",
    timestamp: '2026-02-24T12:30:00Z',
    type: 'success',
  },
  {
    id: 'act-003',
    message: "Security scan flagged 2 warnings for 'EduPortal'",
    timestamp: '2026-02-24T11:15:00Z',
    type: 'warning',
  },
  {
    id: 'act-004',
    message: "New project 'QuickMenu' started Discovery phase",
    timestamp: '2026-02-24T10:00:00Z',
    type: 'info',
  },
  {
    id: 'act-005',
    message: "Spec review approved for 'FitTrack Pro'",
    timestamp: '2026-02-24T09:30:00Z',
    type: 'success',
  },
  {
    id: 'act-006',
    message: "Build failed for 'TaskFlow' — resolved by engineer",
    timestamp: '2026-02-24T08:45:00Z',
    type: 'error',
  },
]

export function getHoursUntilDeadline(deadline: string): number {
  const now = Date.now()
  const dl = new Date(deadline).getTime()
  return (dl - now) / (1000 * 60 * 60)
}

export function formatDeadlineCountdown(deadline: string): string {
  const hours = getHoursUntilDeadline(deadline)
  if (hours < 0) return 'Overdue'
  if (hours < 1) return `${Math.round(hours * 60)}m left`
  if (hours < 24) return `${hours.toFixed(1)}h left`
  return `${Math.floor(hours / 24)}d left`
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id)
}

export function getBuildLogsForProject(projectId: string): BuildLog[] {
  return mockBuildLogs.filter((l) => l.projectId === projectId)
}
