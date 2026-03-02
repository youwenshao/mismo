import type { PRDContent } from '@mismo/shared'
import { validatePRD, quickCompletenessCheck } from './index'

/**
 * EXAMPLE PRDs FOR VALIDATION TESTING
 * 
 * These examples demonstrate the validation framework in action.
 * Each example shows common PRD anti-patterns and how the validator catches them.
 */

// ============================================================================
// BAD EXAMPLE - Generic, non-implementable PRD
// ============================================================================

export const badExamplePRD: PRDContent = {
  overview: 'A project management app for teams.',
  problemStatement: 'Teams need better organization.',
  targetUsers: 'Teams and businesses.',
  features: [
    {
      name: 'Projects',
      description: 'Core entity: Project',
      priority: 'must-have',
      userStories: [
        {
          title: 'Use Projects',
          given: 'a registered user who needs this feature',
          when: 'they navigate to the Projects and interact with it',
          then: 'they can successfully use this feature and see confirmation of the result',
        },
      ],
    },
    {
      name: 'Tasks',
      description: 'Manages tasks for users',
      priority: 'must-have',
      userStories: [
        {
          title: 'Use Tasks',
          given: 'a registered user who needs manages tasks',
          when: 'they navigate to the Tasks and interact with it',
          then: 'they can successfully manages tasks and see confirmation of the result',
        },
        {
          title: 'Handle Tasks errors',
          given: 'a user attempting to use Tasks with invalid input',
          when: 'they submit the invalid data',
          then: 'they see a clear error message explaining what went wrong and how to fix it',
        },
      ],
    },
    {
      name: 'Users',
      description: 'Handles user management and authentication',
      priority: 'must-have',
      userStories: [
        {
          title: 'User management',
          given: 'a user with accessibility needs on any supported device',
          when: 'they access the Users feature using assistive technology',
          then: 'all functionality is available and properly labeled for screen readers',
        },
      ],
    },
  ],
  monetization: 'Subscription model.',
  constraints: ['Must be secure', 'Should be fast'],
}

// ============================================================================
// GOOD EXAMPLE - Detailed, implementable PRD
// ============================================================================

export const goodExamplePRD: PRDContent = {
  overview: `TaskFlow is a collaborative project management platform designed specifically for remote software development teams. 
  
The platform combines Kanban boards, sprint planning, and real-time notifications to streamline agile workflows. Teams can create projects, break them down into tasks with subtasks, assign team members with specific roles (admin, editor, viewer), and track progress through customizable workflows.

Key differentiators include: GitHub integration that automatically updates task status based on commit messages, time tracking with automatic timesheet generation, and AI-powered sprint planning that suggests task assignments based on team capacity and historical velocity.`,

  problemStatement: `Remote development teams currently waste 4+ hours per week on status updates across disconnected tools (Slack for communication, Jira for tickets, GitHub for code, spreadsheets for time tracking). This leads to:
- Information silos: Updates in one tool don't reflect in others
- Missed deadlines: 35% of sprint commitments are missed due to poor visibility
- Context switching: Developers check 4+ tools to understand project state
- Reporting overhead: Scrum masters spend 6+ hours manually compiling sprint reports`,

  targetUsers: `Primary: Software developers (individual contributors) who need to track their tasks and collaborate with teammates. They value integrations with their existing tools (GitHub, VS Code) and minimal context switching.

Secondary: Engineering managers and Scrum masters who need visibility into team velocity, sprint progress, and resource allocation. They need automated reporting and forecasting tools.

Tertiary: Product managers who create and prioritize tasks, track feature development, and communicate progress to stakeholders.`,

  features: [
    {
      name: 'Project Management',
      description: `Users can create projects with a name (3-100 characters, unique per organization), optional rich-text description, and customizable settings. Each project supports multiple view modes: Kanban board, List view, and Calendar timeline.

Key capabilities:
- Project templates: Users can save existing projects as templates with 5 built-in options (Agile Sprint, Product Launch, Bug Tracking, Content Calendar, Custom)
- Team invitation: Add members by email with roles (Admin: full control, Editor: create/edit tasks, Viewer: read-only)
- Archive/Delete: Archived projects are read-only but visible; deletion requires admin and removes all data after 30-day grace period
- Settings: Configure workflows (To Do → In Progress → Review → Done, or custom), enable time tracking, set default assignees

Business value: Reduces project setup time from 30 minutes to 2 minutes through templates, ensures consistent processes through configurable workflows.`,
      priority: 'must-have',
      userStories: [
        {
          title: 'Create project from template',
          given: 'I am logged in as a user with project creation permission in my organization',
          when: 'I click "New Project", select the "Agile Sprint" template, enter "Q1 Backend Refactor" as the name, and click "Create"',
          then: 'a new project is created with columns "Backlog", "In Progress", "Review", "Done", and I am redirected to the project board',
        },
        {
          title: 'Invite team member with specific role',
          given: 'I am the admin of project "Mobile App v2"',
          when: 'I click "Invite", enter "sarah@company.com", select role "Editor", and click "Send Invitation"',
          then: 'Sarah receives an email with a join link, and upon accepting, she can create and edit tasks but cannot delete the project or manage members',
        },
        {
          title: 'Cannot create project with duplicate name',
          given: 'My organization already has a project named "Website Redesign"',
          when: 'I try to create a new project with the same name',
          then: 'I see a field-level error "A project with this name already exists" and the create button is disabled until I change the name',
        },
        {
          title: 'Archive completed project',
          given: 'I am admin of a project that has been inactive for 3 months',
          when: 'I click Settings → Archive Project → Confirm',
          then: 'the project status changes to "Archived", it moves to the "Archived" tab, becomes read-only for all members, and an email notification is sent to all project members',
        },
      ],
    },
    {
      name: 'Task Management',
      description: `Tasks are the core work units within projects. Each task has a title (required, 3-200 chars), description (rich text with @mentions and #task references), status (must match project's workflow states), priority (1-5 scale with labels: 1=Critical, 2=High, 3=Medium, 4=Low, 5=Trivial), due date (optional, must be in future), estimated hours (optional, decimal), and assignees (0-n users).

Advanced features:
- Subtasks: Up to 20 nested subtasks, each with their own status and assignee
- Dependencies: Blocked-by / blocking relationships with visual indicators on the board
- Time tracking: Start/stop timer, manual entry, or automatic via IDE extension
- Attachments: Up to 50MB per file, 100 files per task (images, PDFs, code files)
- Comments: Threaded discussions with @notifications and markdown support
- Labels: Custom color-coded labels per project
- Recurring tasks: Daily, weekly, monthly, or custom cron patterns

Automations:
- When PR merged → move linked task to "Review"
- When task overdue → notify assignee and manager
- When all subtasks complete → prompt to complete parent task`,
      priority: 'must-have',
      userStories: [
        {
          title: 'Create task with all fields',
          given: 'I am on the "API Development" project board',
          when: 'I click "+" in the "Backlog" column, enter title "Add OAuth2 authentication", set priority to "2-High", assign to "john@company.com", set due date to "2024-03-15", and click "Create"',
          then: 'the task appears in the Backlog column with a red priority indicator, John receives an email notification, and the task appears on the calendar view',
        },
        {
          title: 'Start time tracking',
          given: 'I am assigned to task "Fix login bug #234"',
          when: 'I click the play icon on the task, work for 2 hours, then click stop',
          then: '2 hours is added to my time log, the task shows "2h tracked", and the time appears in my timesheet for today',
        },
        {
          title: 'Task dependency prevents status change',
          given: 'Task B is marked as "Blocked by Task A", and Task A is still "In Progress"',
          when: 'I try to drag Task B to the "Done" column',
          then: 'the move is prevented, a tooltip shows "Blocked by: Task A", and a modal offers to view the blocking task',
        },
        {
          title: 'GitHub PR auto-updates task',
          given: 'Task "Add OAuth2" is linked to GitHub PR #156',
          when: 'the PR is merged to main branch',
          then: 'the task automatically moves to the "Review" column, a comment is added with the merge commit SHA, and the assignee is notified',
        },
      ],
    },
    {
      name: 'GitHub Integration',
      description: `Bi-directional sync with GitHub repositories. Supports linking tasks to PRs, issues, and commits. Automatically updates task status based on GitHub events. Requires GitHub App installation with repository access.

Features:
- PR linking: Mention "Fixes TF-123" in PR description to link
- Branch naming: Enforce "feature/TF-123-description" pattern
- Commit message parsing: Extract time spent from "[2h] Fixed bug"
- Status sync: Draft PR → In Progress, Review Requested → Review, Merged → Done
- Webhook handling: Process push, PR, issue, and release events

Security: Uses GitHub App with minimal permissions (read repo contents, read/write issues and PRs). No code access. OAuth tokens encrypted at rest.`,
      priority: 'should-have',
      userStories: [
        {
          title: 'Link task to PR',
          given: 'I am working on task TF-456 and have created PR #78',
          when: 'I add "Fixes TF-456" to the PR description',
          then: 'within 30 seconds, the task shows "Linked to PR #78" badge, a link to the PR appears in the task sidebar, and PR status (open/merged) is displayed',
        },
        {
          title: 'Commit message updates time tracking',
          given: 'I have task TF-789 in progress',
          when: 'I commit with message "[3.5h] Implemented authentication middleware [Fixes TF-789]"',
          then: '3.5 hours is logged to my timesheet for TF-789, the task moves to "Review" if all commits pushed, and the commit SHA is linked in task history',
        },
      ],
    },
  ],

  monetization: `Freemium SaaS model:
- Free: Up to 3 projects, 5 team members, 1GB storage, basic integrations
- Pro ($12/user/month): Unlimited projects, 50 team members, 100GB storage, all integrations, priority support
- Enterprise ($29/user/month): Unlimited everything, SSO/SAML, audit logs, custom contracts, dedicated support, SLA guarantees

Annual billing offers 2 months free. Non-profits and open source projects eligible for 50% discount.`,

  constraints: [
    'GDPR compliant - EU data stays in EU regions',
    'SOC 2 Type II certified by Q3 2024',
    '99.9% uptime SLA for Enterprise customers',
    'API rate limits: 1000 requests/minute for Pro, 5000 for Enterprise',
    'All data encrypted at rest (AES-256) and in transit (TLS 1.3)',
    'Password requirements: min 12 chars, complexity enforced',
    'Session timeout: 8 hours idle, 30 days maximum',
    'GitHub App permissions: minimal required, user-approved scopes only',
  ],
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

export function runValidationExamples() {
  console.log('='.repeat(80))
  console.log('BAD EXAMPLE - Generic PRD (NOT IMPLEMENTABLE)')
  console.log('='.repeat(80))
  
  const badResult = validatePRD(badExamplePRD)
  
  console.log('\n📊 Implementability Score:', badResult.implementabilityScore, '/ 100')
  console.log('✅ Is Valid:', badResult.isValid)
  console.log('🔧 Is Implementable:', badResult.isImplementable)
  
  console.log('\n📋 Component Scores:')
  console.log('  - Features:', badResult.scores.features)
  console.log('  - Data Model:', badResult.scores.dataModel)
  console.log('  - API Spec:', badResult.scores.apiSpec)
  console.log('  - Business Logic:', badResult.scores.businessLogic)
  console.log('  - Clarity:', badResult.scores.clarity)
  
  console.log('\n❌ Issues by Severity:')
  const critical = badResult.issues.filter(i => i.severity === 'critical').length
  const high = badResult.issues.filter(i => i.severity === 'high').length
  const medium = badResult.issues.filter(i => i.severity === 'medium').length
  console.log(`  - Critical: ${critical}, High: ${high}, Medium: ${medium}`)
  
  console.log('\n🔍 Sample Issues:')
  badResult.issues.slice(0, 5).forEach(issue => {
    console.log(`  [${issue.severity.toUpperCase()}] ${issue.message}`)
    console.log(`    → ${issue.suggestion}`)
  })
  
  console.log('\n❓ Top Follow-up Questions:')
  badResult.followUpQuestions.slice(0, 5).forEach((q, i) => {
    console.log(`  ${i + 1}. [${q.priority}] ${q.question}`)
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('GOOD EXAMPLE - Detailed PRD (IMPLEMENTABLE)')
  console.log('='.repeat(80))
  
  const goodResult = validatePRD(goodExamplePRD)
  
  console.log('\n📊 Implementability Score:', goodResult.implementabilityScore, '/ 100')
  console.log('✅ Is Valid:', goodResult.isValid)
  console.log('🔧 Is Implementable:', goodResult.isImplementable)
  
  console.log('\n📋 Component Scores:')
  console.log('  - Features:', goodResult.scores.features)
  console.log('  - Data Model:', goodResult.scores.dataModel)
  console.log('  - API Spec:', goodResult.scores.apiSpec)
  console.log('  - Business Logic:', goodResult.scores.businessLogic)
  console.log('  - Clarity:', goodResult.scores.clarity)
  
  console.log('\n❌ Issues by Severity:')
  const gCritical = goodResult.issues.filter(i => i.severity === 'critical').length
  const gHigh = goodResult.issues.filter(i => i.severity === 'high').length
  const gMedium = goodResult.issues.filter(i => i.severity === 'medium').length
  console.log(`  - Critical: ${gCritical}, High: ${gHigh}, Medium: ${gMedium}`)
  
  if (goodResult.issues.length > 0) {
    console.log('\n🔍 Remaining Issues (for improvement):')
    goodResult.issues.slice(0, 3).forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.message}`)
    })
  }
  
  console.log('\n📊 Comparison:')
  console.log('                 | Bad Example | Good Example')
  console.log('  ---------------|-------------|-------------')
  console.log(`  Overall Score  | ${badResult.implementabilityScore.toString().padStart(11)} | ${goodResult.implementabilityScore.toString().padStart(12)}`)
  console.log(`  Critical Issues| ${critical.toString().padStart(11)} | ${gCritical.toString().padStart(12)}`)
  console.log(`  Implementable  | ${(badResult.isImplementable ? 'YES' : 'NO').padStart(11)} | ${(goodResult.isImplementable ? 'YES' : 'NO').padStart(12)}`)
  
  return { badResult, goodResult }
}

// Quick check example
export function runQuickCheckExample() {
  console.log('\n' + '='.repeat(80))
  console.log('QUICK COMPLETENESS CHECK EXAMPLES')
  console.log('='.repeat(80))
  
  console.log('\nBad Example (quick check):')
  const badQuick = quickCompletenessCheck(badExamplePRD)
  console.log('  Score:', badQuick.score)
  console.log('  Is Complete:', badQuick.isComplete)
  console.log('  Missing:', badQuick.missing.join(', '))
  
  console.log('\nGood Example (quick check):')
  const goodQuick = quickCompletenessCheck(goodExamplePRD)
  console.log('  Score:', goodQuick.score)
  console.log('  Is Complete:', goodQuick.isComplete)
  console.log('  Missing:', goodQuick.missing.join(', ') || '(none)')
}

// Run examples (uncomment to execute)
// runValidationExamples()
// runQuickCheckExample()
