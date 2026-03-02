import type { UserStory } from '@mismo/shared'

export interface GeneratedTest {
  filePath: string
  content: string
}

interface FeatureInput {
  name: string
  userStories: UserStory[]
}

function toFileName(featureName: string): string {
  return featureName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function toTestTitle(story: UserStory): string {
  return story.title.replace(/'/g, "\\'")
}

function generateTestBody(story: UserStory): string {
  const lines: string[] = []
  lines.push(`  // Given: ${story.given}`)
  lines.push(`  // When: ${story.when}`)
  lines.push(`  // Then: ${story.then}`)
  lines.push('')
  lines.push('  // TODO: implement once the application UI is available')
  lines.push("  await page.goto('/');")
  lines.push('  await expect(page).toHaveTitle(/.*/);')
  return lines.join('\n')
}

export function generatePlaywrightTests(features: FeatureInput[]): GeneratedTest[] {
  const tests: GeneratedTest[] = []

  for (const feature of features) {
    if (feature.userStories.length === 0) continue

    const slug = toFileName(feature.name)
    const filePath = `e2e/${slug}.spec.ts`

    const lines: string[] = []
    lines.push("import { test, expect } from '@playwright/test';")
    lines.push('')
    lines.push(`test.describe('${feature.name.replace(/'/g, "\\'")}', () => {`)

    for (const story of feature.userStories) {
      lines.push(`  test('${toTestTitle(story)}', async ({ page }) => {`)
      lines.push(generateTestBody(story))
      lines.push('  });')
      lines.push('')
    }

    lines.push('});')
    lines.push('')

    tests.push({ filePath, content: lines.join('\n') })
  }

  return tests
}
