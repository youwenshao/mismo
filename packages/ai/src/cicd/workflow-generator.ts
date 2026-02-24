import { LIGHTHOUSE_THRESHOLD } from '@mismo/shared'

export interface WorkflowConfig {
  projectName: string
  templateId: string
  features: { name: string; acceptanceCriteria: string[] }[]
  enableDAST: boolean
  enableSCA: boolean
  enableLighthouse: boolean
}

function toJobId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function indent(text: string, level: number): string {
  const prefix = '  '.repeat(level)
  return text
    .split('\n')
    .map((line) => (line.trim() ? prefix + line : ''))
    .join('\n')
}

export function generateCIWorkflow(config: WorkflowConfig): string {
  const sections: string[] = []

  sections.push(`name: CI — ${config.projectName}`)
  sections.push('')
  sections.push('on:')
  sections.push('  push:')
  sections.push('    branches: [main]')
  sections.push('  pull_request:')
  sections.push('    branches: [main]')
  sections.push('')
  sections.push('env:')
  sections.push('  NODE_VERSION: "20"')
  sections.push('')
  sections.push('jobs:')

  // --- lint-and-typecheck ---
  sections.push('  lint-and-typecheck:')
  sections.push('    runs-on: ubuntu-latest')
  sections.push('    steps:')
  sections.push('      - uses: actions/checkout@v4')
  sections.push('      - uses: actions/setup-node@v4')
  sections.push('        with:')
  sections.push('          node-version: ${{ env.NODE_VERSION }}')
  sections.push('      - uses: pnpm/action-setup@v2')
  sections.push('        with:')
  sections.push('          version: 9')
  sections.push('      - run: pnpm install --frozen-lockfile')
  sections.push('      - run: pnpm lint')
  sections.push('      - run: pnpm typecheck')

  // --- build ---
  sections.push('')
  sections.push('  build:')
  sections.push('    runs-on: ubuntu-latest')
  sections.push('    needs: lint-and-typecheck')
  sections.push('    steps:')
  sections.push('      - uses: actions/checkout@v4')
  sections.push('      - uses: actions/setup-node@v4')
  sections.push('        with:')
  sections.push('          node-version: ${{ env.NODE_VERSION }}')
  sections.push('      - uses: pnpm/action-setup@v2')
  sections.push('        with:')
  sections.push('          version: 9')
  sections.push('      - run: pnpm install --frozen-lockfile')
  sections.push('      - run: pnpm build')

  // --- e2e tests (if acceptance criteria exist) ---
  const hasAcceptanceCriteria = config.features.some((f) => f.acceptanceCriteria.length > 0)
  if (hasAcceptanceCriteria) {
    sections.push('')
    sections.push('  e2e-tests:')
    sections.push('    runs-on: ubuntu-latest')
    sections.push('    needs: build')
    sections.push('    steps:')
    sections.push('      - uses: actions/checkout@v4')
    sections.push('      - uses: actions/setup-node@v4')
    sections.push('        with:')
    sections.push('          node-version: ${{ env.NODE_VERSION }}')
    sections.push('      - uses: pnpm/action-setup@v2')
    sections.push('        with:')
    sections.push('          version: 9')
    sections.push('      - run: pnpm install --frozen-lockfile')
    sections.push('      - run: pnpm exec playwright install --with-deps')
    sections.push('      - run: pnpm test:e2e')
  }

  // --- lighthouse audit ---
  if (config.enableLighthouse) {
    sections.push('')
    sections.push('  lighthouse:')
    sections.push('    runs-on: ubuntu-latest')
    sections.push('    needs: build')
    sections.push('    steps:')
    sections.push('      - uses: actions/checkout@v4')
    sections.push('      - uses: actions/setup-node@v4')
    sections.push('        with:')
    sections.push('          node-version: ${{ env.NODE_VERSION }}')
    sections.push('      - uses: pnpm/action-setup@v2')
    sections.push('        with:')
    sections.push('          version: 9')
    sections.push('      - run: pnpm install --frozen-lockfile')
    sections.push('      - run: pnpm build')
    sections.push('      - uses: treosh/lighthouse-ci-action@v11')
    sections.push('        with:')
    sections.push('          uploadArtifacts: true')
    sections.push(`          temporaryPublicStorage: true`)
    sections.push('        env:')
    sections.push(`          LHCI_MIN_SCORE_PERFORMANCE: ${LIGHTHOUSE_THRESHOLD / 100}`)
    sections.push(`          LHCI_MIN_SCORE_ACCESSIBILITY: ${LIGHTHOUSE_THRESHOLD / 100}`)
    sections.push(`          LHCI_MIN_SCORE_BEST_PRACTICES: ${LIGHTHOUSE_THRESHOLD / 100}`)
    sections.push(`          LHCI_MIN_SCORE_SEO: ${LIGHTHOUSE_THRESHOLD / 100}`)
  }

  // --- Snyk SCA ---
  if (config.enableSCA) {
    sections.push('')
    sections.push('  sca-scan:')
    sections.push('    runs-on: ubuntu-latest')
    sections.push('    needs: build')
    sections.push('    steps:')
    sections.push('      - uses: actions/checkout@v4')
    sections.push('      - uses: snyk/actions/node@master')
    sections.push('        with:')
    sections.push('          command: test')
    sections.push('        env:')
    sections.push('          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}')
  }

  // --- StackHawk DAST ---
  if (config.enableDAST) {
    sections.push('')
    sections.push('  dast-scan:')
    sections.push('    runs-on: ubuntu-latest')
    sections.push('    needs: build')
    sections.push('    steps:')
    sections.push('      - uses: actions/checkout@v4')
    sections.push('      - uses: actions/setup-node@v4')
    sections.push('        with:')
    sections.push('          node-version: ${{ env.NODE_VERSION }}')
    sections.push('      - uses: pnpm/action-setup@v2')
    sections.push('        with:')
    sections.push('          version: 9')
    sections.push('      - run: pnpm install --frozen-lockfile')
    sections.push('      - run: pnpm build && pnpm start &')
    sections.push('      - uses: stackhawk/hawkscan-action@v2')
    sections.push('        with:')
    sections.push('          apiKey: ${{ secrets.STACKHAWK_API_KEY }}')
    sections.push('          configurationFiles: stackhawk.yml')
  }

  sections.push('')
  return sections.join('\n')
}
