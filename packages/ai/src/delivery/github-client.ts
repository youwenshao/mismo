const GITHUB_API = 'https://api.github.com'

export interface RepoCreateOptions {
  description?: string
  private?: boolean
  autoInit?: boolean
  licenseTemplate?: string
  gitignoreTemplate?: string
}

export interface GitTreeFile {
  path: string
  content: string
}

export interface RepoInfo {
  fullName: string
  htmlUrl: string
  defaultBranch: string
  nodeId: string
}

export interface BranchProtectionConfig {
  requiredReviewers?: number
  dismissStaleReviews?: boolean
  enforceAdmins?: boolean
  allowForcePushes?: boolean
  allowDeletions?: boolean
}

export interface InviteResult {
  invitationId: number
  htmlUrl: string
}

export interface PermissionResult {
  permission: 'admin' | 'write' | 'read' | 'none'
  roleName: string
}

export interface RepoTransferResult {
  success: boolean
  newUrl?: string
}

export class GitHubClient {
  private token: string

  constructor(token?: string) {
    this.token = token ?? process.env.GITHUB_TOKEN ?? ''
    if (!this.token) {
      throw new Error('GitHub token is required. Set GITHUB_TOKEN env var or pass token to constructor.')
    }
  }

  async createRepo(
    org: string,
    name: string,
    options: RepoCreateOptions = {},
  ): Promise<RepoInfo> {
    const body: Record<string, unknown> = {
      name,
      description: options.description ?? `Project ${name} — built by Mismo`,
      private: options.private ?? true,
      auto_init: options.autoInit ?? false,
    }
    if (options.licenseTemplate) body.license_template = options.licenseTemplate
    if (options.gitignoreTemplate) body.gitignore_template = options.gitignoreTemplate

    const data = await this.request<{
      full_name: string
      html_url: string
      default_branch: string
      node_id: string
    }>('POST', `/orgs/${org}/repos`, body)

    return {
      fullName: data.full_name,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
      nodeId: data.node_id,
    }
  }

  async pushTreeCommit(
    owner: string,
    repo: string,
    files: GitTreeFile[],
    message: string,
    branch = 'main',
  ): Promise<string> {
    const refData = await this.request<{ object: { sha: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    )
    const baseSha = refData.object.sha

    const commitData = await this.request<{ tree: { sha: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/commits/${baseSha}`,
    )
    const baseTreeSha = commitData.tree.sha

    const tree = files.map((f) => ({
      path: f.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: f.content,
    }))

    const treeData = await this.request<{ sha: string }>(
      'POST',
      `/repos/${owner}/${repo}/git/trees`,
      { base_tree: baseTreeSha, tree },
    )

    const newCommit = await this.request<{ sha: string }>(
      'POST',
      `/repos/${owner}/${repo}/git/commits`,
      {
        message,
        tree: treeData.sha,
        parents: [baseSha],
      },
    )

    await this.request(
      'PATCH',
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { sha: newCommit.sha },
    )

    return newCommit.sha
  }

  async setupBranchProtection(
    owner: string,
    repo: string,
    branch: string,
    config: BranchProtectionConfig = {},
  ): Promise<void> {
    await this.request(
      'PUT',
      `/repos/${owner}/${repo}/branches/${branch}/protection`,
      {
        required_status_checks: null,
        enforce_admins: config.enforceAdmins ?? true,
        required_pull_request_reviews: {
          required_approving_review_count: config.requiredReviewers ?? 1,
          dismiss_stale_reviews: config.dismissStaleReviews ?? true,
        },
        restrictions: null,
        allow_force_pushes: config.allowForcePushes ?? false,
        allow_deletions: config.allowDeletions ?? false,
      },
    )
  }

  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromRef = 'main',
  ): Promise<string> {
    const refData = await this.request<{ object: { sha: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/ref/heads/${fromRef}`,
    )

    await this.request(
      'POST',
      `/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      },
    )

    return refData.object.sha
  }

  async inviteCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: 'admin' | 'push' | 'pull' = 'admin',
  ): Promise<InviteResult> {
    const data = await this.request<{
      id: number
      html_url: string
    }>(
      'PUT',
      `/repos/${owner}/${repo}/collaborators/${username}`,
      { permission },
    )

    return {
      invitationId: data.id,
      htmlUrl: data.html_url,
    }
  }

  async checkInviteStatus(
    owner: string,
    repo: string,
    invitationId: number,
  ): Promise<'pending' | 'accepted' | 'expired'> {
    try {
      const invitations = await this.request<Array<{ id: number; expired: boolean }>>(
        'GET',
        `/repos/${owner}/${repo}/invitations`,
      )

      const invite = invitations.find((inv) => inv.id === invitationId)
      if (!invite) return 'accepted'
      if (invite.expired) return 'expired'
      return 'pending'
    } catch {
      return 'expired'
    }
  }

  async transferRepo(
    owner: string,
    repo: string,
    newOwner: string,
    teamIds?: number[],
  ): Promise<RepoTransferResult> {
    try {
      const body: Record<string, unknown> = { new_owner: newOwner }
      if (teamIds?.length) body.team_ids = teamIds

      const data = await this.request<{ html_url: string }>(
        'POST',
        `/repos/${owner}/${repo}/transfer`,
        body,
      )

      return { success: true, newUrl: data.html_url }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, newUrl: `Transfer failed: ${message}` }
    }
  }

  async verifyAdminAccess(
    owner: string,
    repo: string,
    username: string,
  ): Promise<PermissionResult> {
    const data = await this.request<{
      permission: 'admin' | 'write' | 'read' | 'none'
      role_name: string
    }>(
      'GET',
      `/repos/${owner}/${repo}/collaborators/${username}/permission`,
    )

    return {
      permission: data.permission,
      roleName: data.role_name,
    }
  }

  async createFromTemplate(
    templateOwner: string,
    templateRepo: string,
    newOwner: string,
    newName: string,
    options: { description?: string; private?: boolean } = {},
  ): Promise<RepoInfo> {
    const data = await this.request<{
      full_name: string
      html_url: string
      default_branch: string
      node_id: string
    }>(
      'POST',
      `/repos/${templateOwner}/${templateRepo}/generate`,
      {
        owner: newOwner,
        name: newName,
        description: options.description ?? `Project ${newName} — built by Mismo`,
        private: options.private ?? true,
        include_all_branches: false,
      },
    )

    return {
      fullName: data.full_name,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
      nodeId: data.node_id,
    }
  }

  async createTag(
    owner: string,
    repo: string,
    tag: string,
    sha: string,
    message?: string,
  ): Promise<void> {
    const tagObject = await this.request<{ sha: string }>(
      'POST',
      `/repos/${owner}/${repo}/git/tags`,
      {
        tag,
        message: message ?? `Release ${tag}`,
        object: sha,
        type: 'commit',
      },
    )

    await this.request(
      'POST',
      `/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/tags/${tag}`,
        sha: tagObject.sha,
      },
    )
  }

  async getLatestCommitSha(
    owner: string,
    repo: string,
    branch = 'main',
  ): Promise<string> {
    const data = await this.request<{ object: { sha: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    )
    return data.object.sha
  }

  async repoExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.request('GET', `/repos/${owner}/${repo}`)
      return true
    } catch {
      return false
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<string | null> {
    try {
      const url = ref
        ? `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
        : `/repos/${owner}/${repo}/contents/${path}`
      const data = await this.request<{ content: string; encoding: string }>(
        'GET',
        url,
      )
      if (data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8')
      }
      return data.content
    } catch {
      return null
    }
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${GITHUB_API}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    const init: RequestInit = { method, headers }
    if (body && method !== 'GET') {
      init.body = JSON.stringify(body)
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `GitHub API ${method} ${path} failed (${response.status}): ${errorText}`,
      )
    }

    if (response.status === 204) return {} as T

    return (await response.json()) as T
  }
}
