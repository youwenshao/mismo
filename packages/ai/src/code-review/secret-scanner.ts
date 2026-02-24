export interface SecretMatch {
  file: string
  line: number
  pattern: string
  severity: 'critical' | 'high' | 'medium'
  snippet: string
}

interface SecretPattern {
  name: string
  regex: RegExp
  severity: 'critical' | 'high' | 'medium'
}

const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/,
    severity: 'critical',
  },
  {
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/i,
    severity: 'critical',
  },

  // Stripe
  {
    name: 'Stripe Secret Key',
    regex: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: 'critical',
  },
  {
    name: 'Stripe Publishable Key (live)',
    regex: /pk_live_[0-9a-zA-Z]{24,}/,
    severity: 'medium',
  },
  {
    name: 'Stripe Test Secret Key',
    regex: /sk_test_[0-9a-zA-Z]{24,}/,
    severity: 'high',
  },

  // GitHub
  {
    name: 'GitHub Personal Access Token',
    regex: /ghp_[0-9a-zA-Z]{36}/,
    severity: 'critical',
  },
  {
    name: 'GitHub OAuth Access Token',
    regex: /gho_[0-9a-zA-Z]{36}/,
    severity: 'critical',
  },
  {
    name: 'GitHub Fine-Grained PAT',
    regex: /github_pat_[0-9a-zA-Z_]{22,}/,
    severity: 'critical',
  },

  // Generic secret/key prefixes
  {
    name: 'Generic sk_ prefix key',
    regex: /(?<![a-zA-Z])sk_[0-9a-zA-Z]{20,}/,
    severity: 'high',
  },
  {
    name: 'Generic pk_ prefix key',
    regex: /(?<![a-zA-Z])pk_[0-9a-zA-Z]{20,}/,
    severity: 'medium',
  },

  // Private keys
  {
    name: 'RSA Private Key',
    regex: /-----BEGIN RSA PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'EC Private Key',
    regex: /-----BEGIN EC PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'Generic Private Key',
    regex: /-----BEGIN PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'PGP Private Key Block',
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/,
    severity: 'critical',
  },

  // Passwords / secrets assigned in code
  {
    name: 'Hardcoded password',
    regex: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{4,}["']/i,
    severity: 'high',
  },
  {
    name: 'Hardcoded secret',
    regex: /(?:secret|api_secret|app_secret)\s*[=:]\s*["'][^"']{4,}["']/i,
    severity: 'high',
  },
  {
    name: 'Hardcoded token',
    regex: /(?:auth_token|access_token|api_token)\s*[=:]\s*["'][^"']{8,}["']/i,
    severity: 'high',
  },

  // Database connection strings with embedded credentials
  {
    name: 'Database connection string with credentials',
    regex: /(?:mysql|postgres|postgresql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i,
    severity: 'critical',
  },

  // JWT tokens (three base64 segments separated by dots)
  {
    name: 'JWT Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    severity: 'high',
  },
]

function extractSnippet(line: string, maxLen = 120): string {
  if (line.length <= maxLen) return line.trim()
  return line.trim().slice(0, maxLen) + '...'
}

export function scanForSecrets(
  files: { path: string; content: string }[],
): SecretMatch[] {
  const matches: SecretMatch[] = []

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          matches.push({
            file: file.path,
            line: i + 1,
            pattern: pattern.name,
            severity: pattern.severity,
            snippet: extractSnippet(line),
          })
        }
      }
    }
  }

  return matches
}
