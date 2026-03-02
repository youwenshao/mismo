import type { OutdatedPackage } from './dependency-checker'

export interface PRCreationInput {
  githubUrl: string
  branch: string
  packages: OutdatedPackage[]
  type: 'security-patch' | 'minor-update' | 'major-update'
}

export interface PRCreationResult {
  prUrl: string
  prNumber: number
  title: string
}

export async function createMaintenancePR(input: PRCreationInput): Promise<PRCreationResult> {
  const { owner, repo } = parseGitHubUrl(input.githubUrl)
  const branchName = `maintenance/${input.type}-${Date.now()}`

  const title = buildPRTitle(input.type, input.packages)
  const body = buildPRBody(input.type, input.packages)
  const labels = buildLabels(input.type)

  const mainRef = await githubApi<{ object: { sha: string } }>(
    `GET /repos/${owner}/${repo}/git/ref/heads/${input.branch}`,
  )

  await githubApi(
    `POST /repos/${owner}/${repo}/git/refs`,
    { ref: `refs/heads/${branchName}`, sha: mainRef.object.sha },
  )

  const packageJsonRef = await githubApi<{ sha: string; content: string }>(
    `GET /repos/${owner}/${repo}/contents/package.json?ref=${branchName}`,
  )

  let packageJson = JSON.parse(
    Buffer.from(packageJsonRef.content, 'base64').toString('utf-8'),
  )

  for (const pkg of input.packages) {
    if (packageJson.dependencies?.[pkg.name]) {
      packageJson.dependencies[pkg.name] = `^${pkg.latest}`
    }
    if (packageJson.devDependencies?.[pkg.name]) {
      packageJson.devDependencies[pkg.name] = `^${pkg.latest}`
    }
  }

  await githubApi(
    `PUT /repos/${owner}/${repo}/contents/package.json`,
    {
      message: title,
      content: Buffer.from(JSON.stringify(packageJson, null, 2) + '\n').toString('base64'),
      sha: packageJsonRef.sha,
      branch: branchName,
    },
  )

  const pr = await githubApi<{ html_url: string; number: number }>(
    `POST /repos/${owner}/${repo}/pulls`,
    {
      title,
      body,
      head: branchName,
      base: input.branch,
    },
  )

  if (labels.length > 0) {
    await githubApi(
      `POST /repos/${owner}/${repo}/issues/${pr.number}/labels`,
      { labels },
    ).catch(() => {})
  }

  return { prUrl: pr.html_url, prNumber: pr.number, title }
}

function buildPRTitle(type: string, packages: OutdatedPackage[]): string {
  switch (type) {
    case 'security-patch':
      return `fix(deps): security patches for ${packages.map((p) => p.name).join(', ')}`
    case 'minor-update':
      return `chore(deps): update ${packages.length} minor dependencies`
    case 'major-update':
      return `chore(deps): major version updates (requires approval)`
    default:
      return `chore(deps): dependency updates`
  }
}

function buildPRBody(type: string, packages: OutdatedPackage[]): string {
  const table = packages
    .map((p) => `| ${p.name} | ${p.current} | ${p.latest} | ${p.type} | ${p.isSecurityPatch ? 'Yes' : 'No'} |`)
    .join('\n')

  return `## Automated Dependency Update

| Package | Current | Latest | Type | Security |
|---------|---------|--------|------|----------|
${table}

${type === 'security-patch' ? '**This PR addresses security vulnerabilities and should be merged promptly.**' : ''}
${type === 'major-update' ? '**Major version updates may include breaking changes. Please review carefully before merging.**' : ''}

---
*This PR was automatically created by Mismo maintenance mode.*`
}

function buildLabels(type: string): string[] {
  const labels = ['maintenance', 'dependencies']
  if (type === 'security-patch') labels.push('security')
  if (type === 'major-update') labels.push('needs-review')
  return labels
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`)
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

async function githubApi<T = unknown>(
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const [method, ...pathParts] = endpoint.split(' ')
  const path = pathParts.join(' ')
  const isGet = method === 'GET' || !body

  const url = path.startsWith('http') ? path : `https://api.github.com${path.startsWith('/') ? '' : '/'}${path}`

  const response = await fetch(url, {
    method: isGet ? 'GET' : method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${text}`)
  }

  return response.json() as Promise<T>
}
