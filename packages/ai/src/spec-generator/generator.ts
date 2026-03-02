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
    // Check if we already have an archetype from Mo v2 metadata
    const moArchetype = extractedData.archetype as string | undefined
    if (moArchetype) {
      const mapped = moArchetype.toUpperCase() as keyof typeof ArchTemplate
      if (ArchTemplate[mapped]) return ArchTemplate[mapped]
    }

    // Fallback logic for legacy data
    const pref = extractedData.archPreference as string | undefined
    const scalability = extractedData.scalabilityNeeds as string | undefined
    const hasAI = !!(extractedData.contentTypes as string[] | undefined)?.some(t => t.toLowerCase().includes('ai'))
    const hasCompliance = !!(extractedData.regulatoryDomains as string[] | undefined)?.length

    if (hasAI) return ArchTemplate.AI
    if (hasCompliance) return ArchTemplate.COMPLIANCE
    if (pref === 'scalability' || scalability === 'high') return ArchTemplate.SAAS
    
    return ArchTemplate.SAAS // Default to SAAS as it's our most common robust archetype
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
        Array.isArray(feature.userStories) && feature.userStories.length > 0
          ? feature.userStories
          : this.buildGherkinStories(feature),
    }))
  }

  private buildGherkinStories(feature: PRDFeature): UserStory[] {
    const count = STORIES_BY_PRIORITY[feature.priority] ?? 1
    const stories: UserStory[] = []
    const desc = (feature.description || '').toLowerCase() || 'this feature'

    stories.push({
      title: `Use ${feature.name || 'Feature'}`,
      given: `a registered user who needs ${desc}`,
      when: `they navigate to the ${feature.name || 'feature'} and interact with it`,
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

  generateMermaidDataModel(extractedData: Record<string, unknown>, arch: ArchTemplate): string {
    const features = (extractedData.features as PRDFeature[]) || []
    const businessModel = (extractedData.businessModel as string) || ''
    const hasSubscription = businessModel.toLowerCase().includes('subscription')
    const hasPayments = !!(extractedData.paymentNeeds || extractedData.pricingStrategy || hasSubscription)

    const lines: string[] = ['erDiagram']

    lines.push('    User {')
    lines.push('        string id PK')
    lines.push('        string email')
    lines.push('        string name')
    lines.push('        string role')
    lines.push('        datetime createdAt')
    lines.push('    }')

    const entities: string[] = []
    
    // Add default entities based on archetype
    if (arch === ArchTemplate.SAAS || arch === ArchTemplate.COMPLIANCE) {
      entities.push('Organization', 'TeamMember')
      lines.push('    Organization {')
      lines.push('        string id PK')
      lines.push('        string name')
      lines.push('        string tier')
      lines.push('    }')
      lines.push('    User ||--o{ Organization : "belongs_to"')
    }

    if (arch === ArchTemplate.AI) {
      entities.push('AIPipeline', 'ExecutionLog')
      lines.push('    AIPipeline {')
      lines.push('        string id PK')
      lines.push('        string config')
      lines.push('        string status')
      lines.push('    }')
      lines.push('    ExecutionLog {')
      lines.push('        string id PK')
      lines.push('        string pipelineId FK')
      lines.push('        json output')
      lines.push('    }')
      lines.push('    User ||--o{ AIPipeline : "configures"')
      lines.push('    AIPipeline ||--o{ ExecutionLog : "generates"')
    }

    for (const feature of features) {
      const entityName = toEntityName(feature.name)
      if (entities.includes(entityName)) continue
      entities.push(entityName)
      
      lines.push(`    ${entityName} {`)
      lines.push('        string id PK')
      lines.push('        string userId FK')
      lines.push(`        string title`)
      lines.push('        string status')
      lines.push('        json metadata')
      lines.push('    }')
      lines.push(`    User ||--o{ ${entityName} : "manages"`)
    }

    if (hasPayments) {
      lines.push('    Payment {')
      lines.push('        string id PK')
      lines.push('        string userId FK')
      lines.push('        decimal amount')
      lines.push('        string status')
      lines.push('    }')
      lines.push('    User ||--o{ Payment : "makes"')
    }

    return lines.join('\n')
  }

  generateWithLLM(context: InterviewContext): LLMPromptPayload {
    const { extractedData, messages } = context
    const projectName = (extractedData.projectName as string) || 'Untitled Project'
    const archetype = (extractedData.archetype as string) || 'SaaS'

    const transcript = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Customer' : 'Mo'}: ${m.content}`)
      .join('\n\n')

    const systemPrompt = [
      'You are Mo\'s "Invisible Architect".',
      `Generate a high-fidelity Product Requirements Document (PRD) for "${projectName}".`,
      `The target archetype is: ${archetype}.`,
      '',
      '## The Architect\'s mandate:',
      'If the interview transcript is missing details, YOU MUST MAKE THE CALL.',
      'Do not use "TBD" or "Unknown". Use your expertise to provide the most likely industry-standard solution for this archetype.',
      '',
      '## Requirements:',
      '- Executive Overview: 2-3 paragraphs. Be specific and visionary.',
      '- Problem Statement: Describe the pain point and how this solution eliminates it.',
      '- Target Users: Define 2 distinct personas.',
      '- Features: Include core entities and functional requirements.',
      '- User Stories: Gherkin syntax (Given/When/Then).',
      '- Monetization: A realistic revenue model.',
      '- Constraints: Technical and regulatory bounds.',
      '',
      '## Output Format:',
      'Return valid JSON matching the requestedOutputSchema exactly.',
    ].join('\n')

    const userPrompt = [
      '## Interview Transcript:',
      transcript,
      '',
      '## Raw Extracted Data:',
      JSON.stringify(extractedData, null, 2),
      '',
      'Generate the complete PRD now. Remember: no TBDs. Make the technical decisions required to build a working system.',
    ].join('\n')

    const requestedOutputSchema = JSON.stringify(
      {
        overview: 'string',
        problemStatement: 'string',
        targetUsers: 'string',
        features: [
          {
            name: 'string',
            description: 'string',
            priority: 'must-have | should-have | nice-to-have',
            userStories: [
              {
                title: 'string',
                given: 'string',
                when: 'string',
                then: 'string',
              },
            ],
          },
        ],
        monetization: 'string',
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

    const mermaidDataModel = this.generateMermaidDataModel(extractedData, archTemplate)

    const content: PRDContent = {
      overview: buildOverview(extractedData, archTemplate),
      problemStatement: buildProblemStatement(extractedData, archTemplate),
      targetUsers: buildTargetUsers(extractedData, archTemplate),
      features,
      monetization: buildMonetization(extractedData, archTemplate),
      constraints: buildConstraints(extractedData, archTemplate),
    }

    const flatUserStories = features.flatMap((f) => f.userStories || [])

    return {
      content,
      userStories: flatUserStories as any,
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

function buildOverview(data: Record<string, unknown>, arch: ArchTemplate): string {
  const moDraft = (data.prer_draft as any)?.solution_approach || (data.solution_approach as string)
  if (moDraft && moDraft !== 'TBD') return moDraft

  const description = data.initialDescription as string | undefined
  const projectName = (data.projectName as string) || 'The Project'

  if (description && description !== 'TBD') {
    return `${projectName} is ${description}. This ${arch.toLowerCase()} solution is designed for maximum efficiency and growth.`
  }

  // Fallback decision
  return `${projectName} is a modern ${arch.toLowerCase()} platform built to solve industry-standard challenges in its domain.`
}

function buildProblemStatement(data: Record<string, unknown>, arch: ArchTemplate): string {
  const moDraft = (data.prer_draft as any)?.business_problem || (data.business_problem as string)
  if (moDraft && moDraft !== 'TBD') return moDraft

  const problem = data.problemStatement as string | undefined
  if (problem && problem !== 'TBD') return problem

  // Fallback decision
  return `Users currently face significant friction in ${arch.toLowerCase()} workflows, leading to lost time and data fragmentation. This project automates and streamlines these critical processes.`
}

function buildTargetUsers(data: Record<string, unknown>, arch: ArchTemplate): string {
  const primaryUsers = data.primaryUsers as string | undefined
  if (primaryUsers && primaryUsers !== 'TBD') return primaryUsers

  // Fallback decision based on archetype
  switch (arch) {
    case ArchTemplate.MARKETING: return 'Brand managers and marketing teams looking to establish a strong online presence.'
    case ArchTemplate.SAAS: return 'Business professionals and operations teams requiring structured data management.'
    case ArchTemplate.AI: return 'Data-driven decision makers and researchers utilizing automated intelligence.'
    default: return 'End-users requiring a streamlined, modern digital experience.'
  }
}

function buildMonetization(data: Record<string, unknown>, arch: ArchTemplate): string {
  const moDraft = data.businessModel as string | undefined
  if (moDraft && moDraft !== 'TBD') return moDraft

  // Fallback decision
  if (arch === ArchTemplate.MARKETING) return 'Brand awareness and lead generation.'
  return 'Tiered subscription model (SaaS) with a focus on monthly recurring revenue.'
}

function buildConstraints(extractedData: Record<string, unknown>, arch: ArchTemplate): string[] {
  const constraints = (extractedData.detected_constraints as string[]) || []
  if (constraints.length > 0) return constraints

  const legacy = (extractedData.regulatoryDomains as string[]) || []
  if (legacy.length > 0) return legacy

  // Fallback decisions
  const defaults = ['Modern web browser compatibility', 'Secure data encryption at rest and in transit']
  if (arch === ArchTemplate.COMPLIANCE) defaults.push('GDPR and industry-specific regulatory standards')
  if (arch === ArchTemplate.AI) defaults.push('API rate limits and processing latency bounds')
  
  return defaults
}
