export interface RaceConditionMatch {
  file: string
  line: number
  description: string
  suggestion: string
}

interface DetectionRule {
  name: string
  detect: (lines: string[], filePath: string) => RaceConditionMatch[]
}

const SHARED_MUTABLE_STATE: DetectionRule = {
  name: 'Shared mutable state without synchronization',
  detect(lines, filePath) {
    const matches: RaceConditionMatch[] = []
    const moduleLetPattern = /^(?:export\s+)?let\s+(\w+)\s*[=:]/
    const asyncFnPattern = /async\s+(?:function\s+)?(\w+)/

    const mutableVars: { name: string; line: number }[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      const letMatch = line.match(moduleLetPattern)
      if (letMatch) {
        mutableVars.push({ name: letMatch[1]!, line: i + 1 })
      }
    }

    if (mutableVars.length === 0) return matches

    let insideAsync = false
    let asyncDepth = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!

      if (asyncFnPattern.test(line)) {
        insideAsync = true
        asyncDepth = 0
      }

      if (insideAsync) {
        asyncDepth += (line.match(/{/g) || []).length
        asyncDepth -= (line.match(/}/g) || []).length

        for (const v of mutableVars) {
          const assignPattern = new RegExp(`\\b${v.name}\\s*(?:[+\\-*/]?=)`)
          if (assignPattern.test(line) && i + 1 !== v.line) {
            matches.push({
              file: filePath,
              line: i + 1,
              description: `Module-level mutable variable "${v.name}" (declared at line ${v.line}) is modified inside an async function`,
              suggestion:
                'Use a mutex/lock, move the state into a request-scoped context, or use atomic operations.',
            })
          }
        }

        if (asyncDepth <= 0 && i > 0) {
          insideAsync = false
        }
      }
    }

    return matches
  },
}

const PROMISE_ALL_DEPENDENT: DetectionRule = {
  name: 'Promise.all with dependent operations',
  detect(lines, filePath) {
    const matches: RaceConditionMatch[] = []
    const promiseAllPattern = /Promise\.all\s*\(\s*\[/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (!promiseAllPattern.test(line)) continue

      let bracketDepth = 0
      const promiseBody: string[] = []
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        promiseBody.push(lines[j]!)
        bracketDepth += (lines[j]!.match(/\[/g) || []).length
        bracketDepth -= (lines[j]!.match(/]/g) || []).length
        if (bracketDepth <= 0 && j > i) break
      }

      const body = promiseBody.join('\n')
      const writeOps =
        body.match(/\b(?:update|delete|create|insert|remove|set|push|write)\w*\s*\(/gi) || []
      if (writeOps.length >= 2) {
        matches.push({
          file: filePath,
          line: i + 1,
          description: `Promise.all contains ${writeOps.length} write-like operations that may have ordering dependencies`,
          suggestion:
            'If these operations depend on each other, execute them sequentially with await instead of Promise.all.',
        })
      }
    }

    return matches
  },
}

const MISSING_AWAIT: DetectionRule = {
  name: 'Missing await on async call',
  detect(lines, filePath) {
    const matches: RaceConditionMatch[] = []
    const asyncCallPattern =
      /(?<!await\s)(?<!return\s)(?<!\.then\()(\w+Async|\w+\.(?:save|create|update|delete|remove|send|fetch|findMany|findFirst|findUnique)\s*\()/

    let insideAsync = false
    let asyncDepth = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      const trimmed = line.trim()

      if (/async\s+/.test(line)) {
        insideAsync = true
        asyncDepth = 0
      }

      if (insideAsync) {
        asyncDepth += (line.match(/{/g) || []).length
        asyncDepth -= (line.match(/}/g) || []).length

        if (asyncCallPattern.test(trimmed) && !/^\s*(\/\/|\/\*|\*)/.test(line)) {
          if (
            !/await\s/.test(trimmed) &&
            !/\.then\s*\(/.test(trimmed) &&
            !/return\s/.test(trimmed)
          ) {
            matches.push({
              file: filePath,
              line: i + 1,
              description: `Potentially missing \`await\` on async call`,
              suggestion:
                'Add `await` to ensure the operation completes before continuing, or explicitly handle the returned Promise.',
            })
          }
        }

        if (asyncDepth <= 0 && i > 0) {
          insideAsync = false
        }
      }
    }

    return matches
  },
}

const READ_THEN_WRITE: DetectionRule = {
  name: 'Non-atomic read-then-write',
  detect(lines, filePath) {
    const matches: RaceConditionMatch[] = []
    const readPattern = /await\s+(?:\w+\.)*(?:find\w+|get\w+|fetch\w+|select\w+|read\w*)\s*\(/i
    const writePattern = /await\s+(?:\w+\.)*(?:update\w*|save\w*|set\w*|put\w*|write\w*)\s*\(/i

    for (let i = 0; i < lines.length; i++) {
      if (!readPattern.test(lines[i]!)) continue

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        if (writePattern.test(lines[j]!)) {
          const gapLines = lines.slice(i, j + 1).join('\n')
          if (!/transaction|lock|mutex|atomic/i.test(gapLines)) {
            matches.push({
              file: filePath,
              line: i + 1,
              description: `Read at line ${i + 1} followed by write at line ${j + 1} without transaction or lock`,
              suggestion:
                'Wrap the read-then-write in a database transaction (e.g., `prisma.$transaction`) or use an atomic operation.',
            })
          }
          break
        }
      }
    }

    return matches
  },
}

const RULES: DetectionRule[] = [
  SHARED_MUTABLE_STATE,
  PROMISE_ALL_DEPENDENT,
  MISSING_AWAIT,
  READ_THEN_WRITE,
]

export function detectRaceConditions(
  files: { path: string; content: string }[],
): RaceConditionMatch[] {
  const matches: RaceConditionMatch[] = []

  for (const file of files) {
    const lines = file.content.split('\n')
    for (const rule of RULES) {
      matches.push(...rule.detect(lines, file.path))
    }
  }

  return matches
}
