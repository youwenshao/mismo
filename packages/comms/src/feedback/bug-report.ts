export interface BugReportInput {
  commissionId: string
  githubUrl: string
  title: string
  description: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  reporterEmail: string
}

export interface BugReportResult {
  issueUrl: string
  issueNumber: number
}

export async function createBugReport(input: BugReportInput): Promise<BugReportResult> {
  const { owner, repo } = parseGitHubUrl(input.githubUrl)

  const body = formatIssueBody(input)

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[Bug] ${input.title}`,
      body,
      labels: ['bug', 'client-reported'],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub issue creation failed: ${response.status} ${text}`)
  }

  const issue = (await response.json()) as { html_url: string; number: number }
  return { issueUrl: issue.html_url, issueNumber: issue.number }
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`)
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

function formatIssueBody(input: BugReportInput): string {
  return `## Bug Report

**Reported by**: ${input.reporterEmail}
**Commission**: ${input.commissionId}

### Description
${input.description}

${input.stepsToReproduce ? `### Steps to Reproduce\n${input.stepsToReproduce}` : ''}

${input.expectedBehavior ? `### Expected Behavior\n${input.expectedBehavior}` : ''}

${input.actualBehavior ? `### Actual Behavior\n${input.actualBehavior}` : ''}

---
*This issue was automatically created from a client bug report.*`
}
