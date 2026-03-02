export interface N1QueryMatch {
  file: string
  line: number
  description: string
  suggestion: string
}

interface DetectionRule {
  name: string
  detect: (lines: string[], filePath: string) => N1QueryMatch[]
}

const PRISMA_FINDMANY_IN_LOOP: DetectionRule = {
  name: 'Prisma findMany inside loop',
  detect(lines, filePath) {
    const matches: N1QueryMatch[] = []
    const loopPattern = /\b(for\s*\(|\.forEach\s*\(|\.map\s*\(|while\s*\()/
    const findManyPattern = /prisma\.\w+\.find(?:Many|First|Unique)\s*\(/

    let insideLoop = false
    let loopDepth = 0
    let loopStartLine = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!

      if (loopPattern.test(line)) {
        if (!insideLoop) {
          insideLoop = true
          loopStartLine = i
          loopDepth = 0
        }
      }

      if (insideLoop) {
        loopDepth += (line.match(/{/g) || []).length
        loopDepth -= (line.match(/}/g) || []).length

        if (findManyPattern.test(line)) {
          matches.push({
            file: filePath,
            line: i + 1,
            description: `Prisma query inside loop (loop starts at line ${loopStartLine + 1})`,
            suggestion:
              'Move the query outside the loop, or use a single query with `where: { id: { in: ids } }` and `include` for relations.',
          })
        }

        if (loopDepth <= 0 && i > loopStartLine) {
          insideLoop = false
        }
      }
    }

    return matches
  },
}

const AWAIT_IN_LOOP: DetectionRule = {
  name: 'Await DB-like call inside loop',
  detect(lines, filePath) {
    const matches: N1QueryMatch[] = []
    const loopPattern = /\b(for\s*\(|\.forEach\s*\(|\.map\s*\(|for\s+.*\s+of\s+)/
    const awaitDbPattern =
      /await\s+(?:\w+\.)*(?:find|query|fetch|get|select|insert|update|delete|create|remove|execute|count)\w*\s*\(/i

    let insideLoop = false
    let loopDepth = 0
    let loopStartLine = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!

      if (loopPattern.test(line)) {
        if (!insideLoop) {
          insideLoop = true
          loopStartLine = i
          loopDepth = 0
        }
      }

      if (insideLoop) {
        loopDepth += (line.match(/{/g) || []).length
        loopDepth -= (line.match(/}/g) || []).length

        if (awaitDbPattern.test(line)) {
          matches.push({
            file: filePath,
            line: i + 1,
            description: `Awaited DB-like call inside loop (loop starts at line ${loopStartLine + 1})`,
            suggestion:
              'Batch the operations using Promise.all with a pre-collected list of IDs, or use a bulk query.',
          })
        }

        if (loopDepth <= 0 && i > loopStartLine) {
          insideLoop = false
        }
      }
    }

    return matches
  },
}

const MISSING_INCLUDE: DetectionRule = {
  name: 'Missing include on Prisma relation access',
  detect(lines, filePath) {
    const matches: N1QueryMatch[] = []
    const findPattern = /(\w+)\s*=\s*await\s+prisma\.(\w+)\.find\w+\s*\(/
    const includePattern = /include\s*:/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      const findMatch = line.match(findPattern)
      if (!findMatch) continue

      const varName = findMatch[1]!
      let hasInclude = false
      let braceDepth = 0
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        braceDepth += (lines[j]!.match(/{/g) || []).length
        braceDepth -= (lines[j]!.match(/}/g) || []).length
        if (includePattern.test(lines[j]!)) {
          hasInclude = true
          break
        }
        if (braceDepth <= 0 && j > i) break
      }

      if (hasInclude) continue

      const relationAccess = new RegExp(`${varName}\\.\\w+\\.\\w+`)
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        if (relationAccess.test(lines[j]!)) {
          matches.push({
            file: filePath,
            line: i + 1,
            description: `Query result "${varName}" accesses nested relation at line ${j + 1} without \`include\``,
            suggestion: `Add \`include: { <relation> : true }\` to the query to eagerly load the relation.`,
          })
          break
        }
      }
    }

    return matches
  },
}

const RULES: DetectionRule[] = [PRISMA_FINDMANY_IN_LOOP, AWAIT_IN_LOOP, MISSING_INCLUDE]

export function detectNPlusOneQueries(files: { path: string; content: string }[]): N1QueryMatch[] {
  const matches: N1QueryMatch[] = []

  for (const file of files) {
    const lines = file.content.split('\n')
    for (const rule of RULES) {
      matches.push(...rule.detect(lines, file.path))
    }
  }

  return matches
}
