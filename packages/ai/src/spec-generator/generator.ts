import { ArchTemplate, type PRDContent, type PRDFeature, type UserStory } from '@mismo/shared'
import type { InterviewContext } from '../interview/state-machine'

export interface GeneratedPRD {
  content: PRDContent
  userStories: PRDFeature[]
  archTemplate: ArchTemplate
  ambiguityScore: number
  mermaidDataModel: string
  generatedAt: string
}

export interface LLMPromptPayload {
  systemPrompt: string
  userPrompt: string
  extractedData: Record<string, unknown>
  requestedOutputSchema: string
}

const EXPECTED_FIELDS = [
  'projectName',
  'initialDescription',
  'problemStatement',
  'currentSolutions',
  'uniqueValue',
  'primaryUsers',
  'demographics',
  'expectedVolume',
  'features',
  'featurePriorities',
  'archPreference',
  'scalabilityNeeds',
  'complexityTolerance',
  'businessModel',
  'pricingStrategy',
  'paymentNeeds',
  'dataTypes',
  'regulatoryDomains',
  'contentTypes',
] as const

const STORIES_BY_PRIORITY: Record<string, number> = {
  'must-have': 3,
  'should-have': 2,
  'nice-to-have': 1,
}

export class SpecGenerator {
  selectArchTemplate(extractedData: Record<string, unknown>): ArchTemplate {
    const pref = extractedData.archPreference as string | undefined
    const scalability = extractedData.scalabilityNeeds as string | undefined
    const complexity = extractedData.complexityTolerance as string | undefined
    const features = (extractedData.features as PRDFeature[]) || []
    const hasPayments = !!(extractedData.paymentNeeds || extractedData.pricingStrategy)

    if (pref === 'scalability' || scalability === 'high') {
      return ArchTemplate.MICROSERVICES_SCALE
    }

    if (pref === 'speed' || complexity === 'low') {
      return ArchTemplate.MONOLITHIC_MVP
    }

    if (features.length > 5 && hasPayments && scalability === 'medium') {
      return ArchTemplate.MICROSERVICES_SCALE
    }

    return ArchTemplate.SERVERLESS_SAAS
  }

  calculateAmbiguity(extractedData: Record<string, unknown>): number {
    const filled = EXPECTED_FIELDS.filter((field) => {
      const val = extractedData[field]
      if (val === undefined || val === null || val === '') return false
      if (typeof val === 'string' && val.toUpperCase() === 'TBD') return false
      if (Array.isArray(val) && val.length === 0) return false
      return true
    }).length
    return Math.round((1 - filled / EXPECTED_FIELDS.length) * 100) / 100
  }

  generateUserStories(features: PRDFeature[]): PRDFeature[] {
    return features.map((feature) => ({
      ...feature,
      userStories:
        feature.userStories.length > 0
          ? feature.userStories
          : this.buildGherkinStories(feature),
    }))
  }

  private buildGherkinStories(feature: PRDFeature): UserStory[] {
    const count = STORIES_BY_PRIORITY[feature.priority] ?? 1
    const stories: UserStory[] = []
    const desc = feature.description.toLowerCase()

    stories.push({
      title: `Use ${feature.name}`,
      given: `a registered user who needs ${desc}`,
      when: `they navigate to the ${feature.name} feature and interact with it`,
      then: `they can successfully ${desc} and see confirmation of the result`,
    })

    if (count >= 2) {
      stories.push({
        title: `Handle ${feature.name} errors`,
        given: `a user attempting to use ${feature.name} with invalid input`,
        when: `they submit the invalid data`,
        then: `they see a clear error message explaining what went wrong and how to fix it`,
      })
    }

    if (count >= 3) {
      stories.push({
        title: `${feature.name} accessibility`,
        given: `a user with accessibility needs on any supported device`,
        when: `they access the ${feature.name} feature using assistive technology`,
        then: `all functionality is available and properly labeled for screen readers`,
      })
    }

    return stories
  }

  generateMermaidDataModel(extractedData: Record<string, unknown>): string {
    const features = (extractedData.features as PRDFeature[]) || []
    const hasPayments = !!(extractedData.paymentNeeds || extractedData.pricingStrategy)
    const businessModel = (extractedData.businessModel as string) || ''
    const hasSubscription = businessModel.toLowerCase().includes('subscription')
    const dataTypes = extractedData.dataTypes as string | string[] | undefined

    const lines: string[] = ['erDiagram']

    lines.push('    User {')
    lines.push('        string id PK')
    lines.push('        string email')
    lines.push('        string name')
    lines.push('        string role')
    lines.push('        datetime createdAt')
    lines.push('        datetime updatedAt')
    lines.push('    }')

    const entityNames: string[] = []
    for (const feature of features) {
      const entityName = toEntityName(feature.name)
      entityNames.push(entityName)
      lines.push(`    ${entityName} {`)
      lines.push('        string id PK')
      lines.push('        string userId FK')
      lines.push(`        string title`)
      lines.push('        string status')
      lines.push('        json metadata')
      lines.push('        datetime createdAt')
      lines.push('        datetime updatedAt')
      lines.push('    }')
      lines.push(`    User ||--o{ ${entityName} : "creates"`)
    }

    if (entityNames.length >= 2) {
      lines.push(`    ${entityNames[0]} ||--o{ ${entityNames[1]} : "references"`)
    }

    if (hasPayments || hasSubscription) {
      lines.push('    Payment {')
      lines.push('        string id PK')
      lines.push('        string userId FK')
      lines.push('        decimal amount')
      lines.push('        string currency')
      lines.push('        string status')
      lines.push('        string provider')
      lines.push('        datetime createdAt')
      lines.push('    }')
      lines.push('    User ||--o{ Payment : "makes"')
    }

    if (hasSubscription) {
      lines.push('    Subscription {')
      lines.push('        string id PK')
      lines.push('        string userId FK')
      lines.push('        string plan')
      lines.push('        string status')
      lines.push('        datetime startDate')
      lines.push('        datetime endDate')
      lines.push('    }')
      lines.push('    User ||--|| Subscription : "subscribes"')
      lines.push('    Subscription ||--o{ Payment : "generates"')
    }

    if (dataTypes) {
      const types = Array.isArray(dataTypes) ? dataTypes : [dataTypes]
      if (types.some((t) => t.toLowerCase().includes('file') || t.toLowerCase().includes('media'))) {
        lines.push('    Attachment {')
        lines.push('        string id PK')
        lines.push('        string userId FK')
        lines.push('        string url')
        lines.push('        string mimeType')
        lines.push('        int sizeBytes')
        lines.push('        datetime createdAt')
        lines.push('    }')
        lines.push('    User ||--o{ Attachment : "uploads"')
      }
    }

    return lines.join('\n')
  }

  generateWithLLM(extractedData: Record<string, unknown>): LLMPromptPayload {
    const projectName = (extractedData.projectName as string) || 'Untitled Project'
    const features = (extractedData.features as PRDFeature[]) || []

    const systemPrompt = [
      'You are a senior product manager at a top-tier software consultancy.',
      `Generate a comprehensive Product Requirements Document (PRD) for "${projectName}".`,
      '',
      '## Requirements',
      '',
      '### Executive Overview',
      'Write a 2-3 paragraph summary covering the product purpose, target market, and key differentiators.',
      '',
      '### Problem Statement',
      'Articulate the specific problem: current pain points, existing solutions and shortcomings, and the opportunity gap.',
      '',
      '### Target Users',
      'Define primary user personas with demographics, technical proficiency, key needs, and usage patterns.',
      '',
      '### Features',
      'For each feature provide:',
      '- Name and detailed description',
      '- Priority: "must-have", "should-have", or "nice-to-have"',
      '- 1-3 user stories in Gherkin syntax (Given/When/Then) with specific, testable conditions',
      '',
      '### Monetization',
      'Describe revenue model, pricing tiers, payment flow, and key metrics.',
      '',
      '### Constraints',
      'List all technical, regulatory, and business constraints.',
      '',
      '## Output Format',
      'Return valid JSON matching the requestedOutputSchema exactly.',
      'Ensure all user stories follow Gherkin Given/When/Then format.',
    ].join('\n')

    const userPrompt = [
      '## Interview Data',
      JSON.stringify(extractedData, null, 2),
      '',
      '## Identified Features',
      ...features.map((f, i) => `${i + 1}. ${f.name} [${f.priority}]: ${f.description}`),
      '',
      'Generate the PRD now.',
    ].join('\n')

    const requestedOutputSchema = JSON.stringify(
      {
        overview: 'string (2-3 paragraphs)',
        problemStatement: 'string (specific problem articulation)',
        targetUsers: 'string (persona description)',
        features: [
          {
            name: 'string',
            description: 'string (detailed)',
            priority: 'must-have | should-have | nice-to-have',
            userStories: [
              {
                title: 'string',
                given: 'string (precondition)',
                when: 'string (action)',
                then: 'string (outcome)',
              },
            ],
          },
        ],
        monetization: 'string (revenue model)',
        constraints: ['string'],
      },
      null,
      2,
    )

    return { systemPrompt, userPrompt, extractedData, requestedOutputSchema }
  }

  async generate(interviewContext: InterviewContext): Promise<GeneratedPRD> {
    const { extractedData } = interviewContext
    const archTemplate = this.selectArchTemplate(extractedData)
    const ambiguityScore = this.calculateAmbiguity(extractedData)

    const rawFeatures: PRDFeature[] = (extractedData.features as PRDFeature[]) || []
    const features = this.generateUserStories(rawFeatures)

    const mermaidDataModel = this.generateMermaidDataModel(extractedData)

    const content: PRDContent = {
      overview: buildOverview(extractedData),
      problemStatement: buildProblemStatement(extractedData),
      targetUsers: buildTargetUsers(extractedData),
      features,
      monetization: buildMonetization(extractedData),
      constraints: buildConstraints(extractedData),
    }

    return {
      content,
      userStories: features,
      archTemplate,
      ambiguityScore,
      mermaidDataModel,
      generatedAt: new Date().toISOString(),
    }
  }
}

function toEntityName(featureName: string): string {
  return featureName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function buildOverview(data: Record<string, unknown>): string {
  const description = data.initialDescription as string | undefined
  const uniqueValue = data.uniqueValue as string | undefined
  const projectName = data.projectName as string | undefined

  const parts: string[] = []
  if (projectName && description) {
    parts.push(`${projectName} is ${description}.`)
  } else if (description) {
    parts.push(description)
  }

  if (uniqueValue) {
    parts.push(`Key differentiator: ${uniqueValue}.`)
  }

  return parts.length > 0 ? parts.join(' ') : 'TBD'
}

function buildProblemStatement(data: Record<string, unknown>): string {
  const problem = data.problemStatement as string | undefined
  const currentSolutions = data.currentSolutions as string | undefined

  const parts: string[] = []
  if (problem) parts.push(problem)
  if (currentSolutions) {
    parts.push(`Current alternatives include ${currentSolutions}, which fail to fully address the need.`)
  }

  return parts.length > 0 ? parts.join(' ') : 'TBD'
}

function buildTargetUsers(data: Record<string, unknown>): string {
  const primaryUsers = data.primaryUsers as string | undefined
  const demographics = data.demographics as string | undefined
  const expectedVolume = data.expectedVolume as string | undefined

  const parts: string[] = []
  if (primaryUsers) parts.push(`Primary users: ${primaryUsers}.`)
  if (demographics) parts.push(`Demographics: ${demographics}.`)
  if (expectedVolume) parts.push(`Expected user volume: ${expectedVolume}.`)

  return parts.length > 0 ? parts.join(' ') : 'TBD'
}

function buildMonetization(data: Record<string, unknown>): string {
  const model = data.businessModel as string | undefined
  const pricing = data.pricingStrategy as string | undefined
  const payments = data.paymentNeeds as string | undefined

  const parts: string[] = []
  if (model) parts.push(`Business model: ${model}.`)
  if (pricing) parts.push(`Pricing strategy: ${pricing}.`)
  if (payments) parts.push(`Payment requirements: ${payments}.`)

  return parts.length > 0 ? parts.join(' ') : 'TBD'
}

function buildConstraints(extractedData: Record<string, unknown>): string[] {
  const constraints: string[] = []
  const dataTypes = extractedData.dataTypes as string | string[] | undefined
  const regulatoryDomains = extractedData.regulatoryDomains as string | string[] | undefined

  if (dataTypes) {
    const types = Array.isArray(dataTypes) ? dataTypes : [dataTypes]
    for (const t of types) {
      if (t.toLowerCase().includes('health')) constraints.push('HIPAA compliance required')
      if (t.toLowerCase().includes('financial')) constraints.push('PCI-DSS compliance required')
      if (t.toLowerCase().includes('children')) constraints.push('COPPA compliance required')
      if (t.toLowerCase().includes('personal')) constraints.push('GDPR/privacy compliance required')
    }
  }

  if (regulatoryDomains) {
    const domains = Array.isArray(regulatoryDomains) ? regulatoryDomains : [regulatoryDomains]
    for (const d of domains) {
      constraints.push(`Regulatory domain: ${d}`)
    }
  }

  if (extractedData.scalabilityNeeds === 'high') {
    constraints.push('High-availability architecture required')
  }

  if (extractedData.contentTypes) {
    const types = extractedData.contentTypes as string | string[]
    const arr = Array.isArray(types) ? types : [types]
    if (arr.some((t) => t.toLowerCase().includes('video') || t.toLowerCase().includes('stream'))) {
      constraints.push('Media streaming infrastructure required')
    }
  }

  return constraints
}
