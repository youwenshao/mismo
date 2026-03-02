/**
 * Spec Generator v3
 * 
 * Changes from v2:
 * - Integrates with PRD validation framework
 * - Generates API specifications (previously missing)
 * - Creates detailed data models (not just generic entities)
 * - Validates output before returning
 * - Provides follow-up questions if PRD is incomplete
 */

import { ArchTemplate, type PRDContent, type PRDFeature, type UserStory, type APISpec } from '@mismo/shared'
import type { InterviewContext } from '../interview/state-machine'
import { PRDValidator, quickCompletenessCheck } from '../prd-validation'

export interface GeneratedPRD {
  content: PRDContent
  features: PRDFeature[]
  archTemplate: ArchTemplate
  ambiguityScore: number
  mermaidDataModel: string
  apiSpec: APISpec
  generatedAt: string
  validationResult: {
    isImplementable: boolean
    score: number
    issues: string[]
    followUpQuestions: string[]
  }
}

export interface LLMPromptPayload {
  systemPrompt: string
  userPrompt: string
  extractedData: Record<string, unknown>
  requestedOutputSchema: string
}

const EXPECTED_FIELDS = [
  'projectName',
  'problemStatement',
  'primaryUsers',
  'workflows',
  'features',
  'integrations',
  'scaleExpectations',
  'complianceNeeds',
  'designPreferences',
  'timelineConstraints',
] as const

export class SpecGeneratorV3 {
  private validator: PRDValidator

  constructor() {
    this.validator = new PRDValidator()
  }

  selectArchTemplate(extractedData: Record<string, unknown>): ArchTemplate {
    // Check if we already have an archetype from Mo v3 metadata
    const moArchetype = extractedData.archetype as string | undefined
    if (moArchetype) {
      const mapped = moArchetype.toUpperCase() as keyof typeof ArchTemplate
      if (ArchTemplate[mapped]) return ArchTemplate[mapped]
    }

    // Infer from features and requirements
    const features = (extractedData.features as PRDFeature[]) || []
    const integrations = (extractedData.integrations as string[]) || []
    const complianceNeeds = (extractedData.complianceNeeds as string[]) || []

    // AI archetype detection
    const hasAI = features.some(f => 
      f.name.toLowerCase().includes('ai') ||
      f.name.toLowerCase().includes('ml') ||
      f.name.toLowerCase().includes('recommendation') ||
      f.name.toLowerCase().includes('prediction')
    ) || integrations.some(i => 
      i.toLowerCase().includes('openai') ||
      i.toLowerCase().includes('anthropic')
    )

    // Compliance archetype detection
    const hasCompliance = complianceNeeds.length > 0 ||
      integrations.some(i => 
        i.toLowerCase().includes('hipaa') ||
        i.toLowerCase().includes('gdpr') ||
        i.toLowerCase().includes('soc2')
      )

    // Real-time/interactive detection
    const hasRealtime = features.some(f =>
      f.name.toLowerCase().includes('chat') ||
      f.name.toLowerCase().includes('live') ||
      f.name.toLowerCase().includes('realtime')
    )

    if (hasCompliance) return ArchTemplate.COMPLIANCE
    if (hasAI) return ArchTemplate.AI
    if (hasRealtime) return ArchTemplate.INTERACTIVE
    
    // Default to SAAS for business applications
    return ArchTemplate.SAAS
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

  /**
   * Generate detailed user stories from feature descriptions
   * Uses extracted workflow data to create specific stories
   */
  generateUserStories(features: PRDFeature[], workflows: Record<string, unknown> = {}): PRDFeature[] {
    return features.map((feature) => {
      // If stories already exist and are specific, keep them
      if (feature.userStories && feature.userStories.length > 0) {
        const hasSpecificStories = feature.userStories.some(s => 
          !s.given.includes('who needs') &&
          !s.when.includes('interact with it') &&
          !s.then.includes('successfully use')
        )
        if (hasSpecificStories) return feature
      }

      // Generate specific stories from workflow data
      const workflow = workflows[feature.name] as Record<string, unknown> | undefined
      return {
        ...feature,
        userStories: this.buildSpecificStories(feature, workflow),
      }
    })
  }

  private buildSpecificStories(feature: PRDFeature, workflow?: Record<string, unknown>): UserStory[] {
    const stories: UserStory[] = []
    const featureName = feature.name
    const description = feature.description || ''

    // Primary success story
    stories.push({
      title: `Complete ${featureName} workflow successfully`,
      given: this.inferGivenCondition(feature, workflow),
      when: this.inferWhenAction(feature, workflow),
      then: this.inferThenOutcome(feature, workflow),
    })

    // Error handling story
    stories.push({
      title: `Handle errors in ${featureName}`,
      given: this.inferGivenCondition(feature, workflow),
      when: this.inferErrorWhenAction(feature, workflow),
      then: `they see a clear error message explaining what went wrong and can correct the issue`,
    })

    // Authorization story (if applicable)
    if (description.toLowerCase().includes('admin') ||
        description.toLowerCase().includes('coach') ||
        description.toLowerCase().includes('client')) {
      stories.push({
        title: `${featureName} authorization check`,
        given: `a user without permission to ${featureName.toLowerCase()}`,
        when: `they attempt to access the ${featureName.toLowerCase()} functionality`,
        then: `they are redirected to an access denied page or shown an appropriate message`,
      })
    }

    return stories
  }

  private inferGivenCondition(feature: PRDFeature, workflow?: Record<string, unknown>): string {
    // Extract actor from description or workflow
    const description = feature.description || ''
    
    if (description.toLowerCase().includes('coach')) {
      return 'I am logged in as a coach with an active account'
    }
    if (description.toLowerCase().includes('client')) {
      return 'I am logged in as a client enrolled in an active program'
    }
    if (description.toLowerCase().includes('admin')) {
      return 'I am logged in as an administrator with full system access'
    }
    
    return 'I am a registered user with appropriate permissions'
  }

  private inferWhenAction(feature: PRDFeature, workflow?: Record<string, unknown>): string {
    const featureName = feature.name.toLowerCase()
    
    // Map common patterns to specific actions
    if (featureName.includes('register') || featureName.includes('signup')) {
      return 'I enter my email, password, and required profile information, then click "Create Account"'
    }
    if (featureName.includes('schedule') || featureName.includes('book')) {
      return 'I select an available time slot from the calendar and click "Book Session"'
    }
    if (featureName.includes('payment')) {
      return 'I enter my payment details and click "Complete Purchase"'
    }
    if (featureName.includes('track') || featureName.includes('progress')) {
      return 'I enter my daily metrics and click "Save Progress"'
    }
    
    return `I navigate to ${featureName} and complete the required information`
  }

  private inferThenOutcome(feature: PRDFeature, workflow?: Record<string, unknown>): string {
    const featureName = feature.name.toLowerCase()
    
    if (featureName.includes('register')) {
      return 'my account is created and I receive a confirmation email with next steps'
    }
    if (featureName.includes('schedule') || featureName.includes('book')) {
      return 'the session is booked, I receive a calendar invite, and the coach is notified'
    }
    if (featureName.includes('payment')) {
      return 'the payment is processed, I receive a receipt, and my access is upgraded'
    }
    if (featureName.includes('track')) {
      return 'my progress is saved, I see my updated stats, and my coach is notified of the update'
    }
    
    return `the ${featureName} operation completes successfully and I see confirmation`
  }

  private inferErrorWhenAction(feature: PRDFeature, workflow?: Record<string, unknown>): string {
    const featureName = feature.name.toLowerCase()
    
    if (featureName.includes('register')) {
      return 'I submit the registration form with an already-used email address'
    }
    if (featureName.includes('schedule')) {
      return 'I attempt to book a time slot that has already been taken'
    }
    if (featureName.includes('payment')) {
      return 'I submit payment with an expired credit card'
    }
    
    return `I attempt to use ${featureName} with invalid or missing information`
  }

  /**
   * Generate detailed data model from extracted information
   * Creates domain-specific fields, not just generic ones
   */
  generateDetailedDataModel(
    extractedData: Record<string, unknown>,
    arch: ArchTemplate
  ): { mermaid: string; entities: DataModelEntity[] } {
    const features = (extractedData.features as PRDFeature[]) || []
    const workflows = (extractedData.workflows as Record<string, unknown>) || {}
    
    const entities: DataModelEntity[] = []
    const relationships: string[] = []

    // Add base entities
    entities.push(this.createUserEntity(extractedData))
    
    if (arch === ArchTemplate.SAAS || arch === ArchTemplate.COMPLIANCE) {
      entities.push(this.createOrganizationEntity())
      relationships.push('    User ||--o{ Organization : "belongs_to"')
    }

    // Create domain-specific entities from features
    for (const feature of features) {
      const entity = this.inferEntityFromFeature(feature, workflows[feature.name] as Record<string, unknown>)
      if (entity && !entities.find(e => e.name === entity.name)) {
        entities.push(entity)
        relationships.push(`    User ||--o{ ${entity.name} : "${entity.userRelationship}"`)
      }
    }

    // Add payment entity if mentioned
    const hasPayments = this.detectPayments(extractedData)
    if (hasPayments) {
      entities.push(this.createPaymentEntity())
      relationships.push('    User ||--o{ Payment : "makes"')
    }

    // Generate Mermaid diagram
    const mermaid = this.generateMermaidDiagram(entities, relationships)

    return { mermaid, entities }
  }

  private createUserEntity(extractedData: Record<string, unknown>): DataModelEntity {
    const userTypes = (extractedData.userTypes as string[]) || ['user']
    const hasCoaches = userTypes.includes('coach')
    const hasClients = userTypes.includes('client')
    const hasAdmins = userTypes.includes('admin')

    const fields: DataModelField[] = [
      { name: 'id', type: 'string', constraints: 'PK' },
      { name: 'email', type: 'string', constraints: 'unique, required' },
      { name: 'name', type: 'string', constraints: 'required' },
      { name: 'role', type: 'enum', constraints: hasCoaches && hasClients ? '[admin, coach, client]' : '[admin, user]' },
      { name: 'status', type: 'enum', constraints: '[active, inactive, suspended]' },
      { name: 'createdAt', type: 'datetime', constraints: '' },
      { name: 'lastLoginAt', type: 'datetime', constraints: '' },
    ]

    // Add role-specific fields
    if (hasCoaches) {
      fields.push(
        { name: 'bio', type: 'text', constraints: '' },
        { name: 'specialties', type: 'json', constraints: '' },
        { name: 'hourlyRate', type: 'decimal', constraints: '' }
      )
    }

    if (hasClients) {
      fields.push(
        { name: 'goals', type: 'text', constraints: '' },
        { name: 'enrollmentDate', type: 'datetime', constraints: '' },
        { name: 'assignedCoachId', type: 'string', constraints: 'FK' }
      )
    }

    return {
      name: 'User',
      fields,
      userRelationship: 'is_a',
    }
  }

  private createOrganizationEntity(): DataModelEntity {
    return {
      name: 'Organization',
      fields: [
        { name: 'id', type: 'string', constraints: 'PK' },
        { name: 'name', type: 'string', constraints: 'required' },
        { name: 'slug', type: 'string', constraints: 'unique' },
        { name: 'tier', type: 'enum', constraints: '[free, basic, pro, enterprise]' },
        { name: 'settings', type: 'json', constraints: '' },
        { name: 'createdAt', type: 'datetime', constraints: '' },
      ],
      userRelationship: 'belongs_to',
    }
  }

  private inferEntityFromFeature(feature: PRDFeature, workflow?: Record<string, unknown>): DataModelEntity | null {
    const name = this.toEntityName(feature.name)
    const description = feature.description.toLowerCase()

    // Infer fields from description
    const fields: DataModelField[] = [
      { name: 'id', type: 'string', constraints: 'PK' },
      { name: 'userId', type: 'string', constraints: 'FK' },
    ]

    // Add domain-specific fields based on feature type
    if (name.toLowerCase().includes('program')) {
      fields.push(
        { name: 'name', type: 'string', constraints: 'required, 3-100 chars' },
        { name: 'description', type: 'text', constraints: '' },
        { name: 'durationWeeks', type: 'integer', constraints: 'required' },
        { name: 'maxParticipants', type: 'integer', constraints: '' },
        { name: 'price', type: 'decimal', constraints: '' },
        { name: 'coachId', type: 'string', constraints: 'FK' },
        { name: 'status', type: 'enum', constraints: '[draft, active, archived]' },
        { name: 'curriculum', type: 'json', constraints: '' },
        { name: 'startDate', type: 'datetime', constraints: '' },
        { name: 'createdAt', type: 'datetime', constraints: '' }
      )
    } else if (name.toLowerCase().includes('session') || name.toLowerCase().includes('schedule')) {
      fields.push(
        { name: 'scheduledAt', type: 'datetime', constraints: 'required' },
        { name: 'durationMinutes', type: 'integer', constraints: 'required' },
        { name: 'coachId', type: 'string', constraints: 'FK' },
        { name: 'clientId', type: 'string', constraints: 'FK' },
        { name: 'sessionType', type: 'enum', constraints: '[initial, follow_up, review]' },
        { name: 'status', type: 'enum', constraints: '[scheduled, completed, cancelled, no_show]' },
        { name: 'notes', type: 'text', constraints: '' },
        { name: 'recordingUrl', type: 'string', constraints: '' },
        { name: 'createdAt', type: 'datetime', constraints: '' }
      )
    } else if (name.toLowerCase().includes('client') || name.toLowerCase().includes('registration')) {
      fields.push(
        { name: 'goals', type: 'text', constraints: '' },
        { name: 'industry', type: 'string', constraints: '' },
        { name: 'experienceLevel', type: 'enum', constraints: '[beginner, intermediate, advanced]' },
        { name: 'preferredSessionTimes', type: 'json', constraints: '' },
        { name: 'enrollmentStatus', type: 'enum', constraints: '[inquiry, applied, accepted, enrolled, completed]' },
        { name: 'assignedCoachId', type: 'string', constraints: 'FK' },
        { name: 'programId', type: 'string', constraints: 'FK' },
        { name: 'enrolledAt', type: 'datetime', constraints: '' }
      )
    } else if (name.toLowerCase().includes('progress')) {
      fields.push(
        { name: 'clientId', type: 'string', constraints: 'FK, required' },
        { name: 'metricType', type: 'enum', constraints: '[weight, measurement, milestone, assessment]' },
        { name: 'value', type: 'decimal', constraints: '' },
        { name: 'unit', type: 'string', constraints: '' },
        { name: 'notes', type: 'text', constraints: '' },
        { name: 'recordedAt', type: 'datetime', constraints: 'required' },
        { name: 'recordedBy', type: 'string', constraints: 'FK - coach or client' }
      )
    } else {
      // Generic fallback with fields extracted from description
      fields.push(
        { name: 'title', type: 'string', constraints: '' },
        { name: 'description', type: 'text', constraints: '' },
        { name: 'status', type: 'enum', constraints: '[active, inactive]' },
        { name: 'metadata', type: 'json', constraints: '' },
        { name: 'createdAt', type: 'datetime', constraints: '' }
      )
    }

    return {
      name,
      fields,
      userRelationship: 'manages',
    }
  }

  private createPaymentEntity(): DataModelEntity {
    return {
      name: 'Payment',
      fields: [
        { name: 'id', type: 'string', constraints: 'PK' },
        { name: 'userId', type: 'string', constraints: 'FK' },
        { name: 'amount', type: 'decimal', constraints: 'required' },
        { name: 'currency', type: 'string', constraints: 'default USD' },
        { name: 'paymentMethod', type: 'enum', constraints: '[card, bank_transfer, paypal]' },
        { name: 'status', type: 'enum', constraints: '[pending, completed, failed, refunded]' },
        { name: 'stripePaymentIntentId', type: 'string', constraints: '' },
        { name: 'billingPeriod', type: 'string', constraints: 'for subscriptions' },
        { name: 'description', type: 'string', constraints: '' },
        { name: 'createdAt', type: 'datetime', constraints: '' },
      ],
      userRelationship: 'makes',
    }
  }

  private detectPayments(extractedData: Record<string, unknown>): boolean {
    const features = (extractedData.features as PRDFeature[]) || []
    const businessModel = (extractedData.businessModel as string) || ''
    
    return features.some(f => 
      f.name.toLowerCase().includes('payment') ||
      f.name.toLowerCase().includes('billing') ||
      f.name.toLowerCase().includes('subscription')
    ) || businessModel.toLowerCase().includes('subscription') ||
       businessModel.toLowerCase().includes('payment')
  }

  private generateMermaidDiagram(entities: DataModelEntity[], relationships: string[]): string {
    const lines: string[] = ['erDiagram']

    for (const entity of entities) {
      lines.push(`    ${entity.name} {`)
      for (const field of entity.fields) {
        const constraints = field.constraints ? ` ${field.constraints}` : ''
        lines.push(`        ${field.type} ${field.name}${constraints}`)
      }
      lines.push('    }')
    }

    for (const rel of relationships) {
      lines.push(rel)
    }

    return lines.join('\n')
  }

  /**
   * Generate API specification from features and data model
   */
  generateAPISpec(
    features: PRDFeature[],
    entities: DataModelEntity[],
    extractedData: Record<string, unknown>
  ): APISpec {
    const endpoints: APIEndpoint[] = []

    // Generate CRUD endpoints for each entity
    for (const entity of entities) {
      if (entity.name === 'User') continue // Skip base entities

      const basePath = `/${entity.name.toLowerCase()}s`
      
      endpoints.push({
        method: 'GET',
        path: basePath,
        description: `List all ${entity.name.toLowerCase()}s with pagination`,
        auth: 'required',
        request: {
          query: ['page', 'limit', 'sort', 'filter'],
        },
        response: {
          type: 'array',
          items: entity.name,
        },
      })

      endpoints.push({
        method: 'GET',
        path: `${basePath}/:id`,
        description: `Get a specific ${entity.name.toLowerCase()} by ID`,
        auth: 'required',
        response: {
          type: entity.name,
        },
      })

      endpoints.push({
        method: 'POST',
        path: basePath,
        description: `Create a new ${entity.name.toLowerCase()}`,
        auth: 'required',
        request: {
          body: entity.fields
            .filter(f => f.name !== 'id' && f.name !== 'createdAt')
            .map(f => ({ field: f.name, type: f.type, required: f.constraints.includes('required') })),
        },
        response: {
          type: entity.name,
        },
      })

      endpoints.push({
        method: 'PATCH',
        path: `${basePath}/:id`,
        description: `Update a ${entity.name.toLowerCase()}`,
        auth: 'required',
        request: {
          body: entity.fields
            .filter(f => f.name !== 'id' && f.name !== 'createdAt')
            .map(f => ({ field: f.name, type: f.type, required: false })),
        },
        response: {
          type: entity.name,
        },
      })

      endpoints.push({
        method: 'DELETE',
        path: `${basePath}/:id`,
        description: `Delete a ${entity.name.toLowerCase()}`,
        auth: 'required',
        response: {
          type: 'success',
        },
      })
    }

    // Add auth endpoints
    endpoints.push(
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Register a new user account',
        auth: 'none',
        request: {
          body: [
            { field: 'email', type: 'string', required: true },
            { field: 'password', type: 'string', required: true },
            { field: 'name', type: 'string', required: true },
          ],
        },
        response: { type: 'user' },
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Authenticate and receive access token',
        auth: 'none',
        request: {
          body: [
            { field: 'email', type: 'string', required: true },
            { field: 'password', type: 'string', required: true },
          ],
        },
        response: { type: 'token' },
      }
    )

    return {
      version: '1.0',
      baseUrl: '/api/v1',
      authentication: 'Bearer token via Authorization header',
      endpoints,
    }
  }

  /**
   * Main generation method
   */
  async generate(interviewContext: InterviewContext): Promise<GeneratedPRD> {
    const { extractedData } = interviewContext
    
    // Quick completeness check first
    const quickCheck = quickCompletenessCheck(extractedData)
    
    if (!quickCheck.isComplete) {
      return {
        content: {} as PRDContent,
        features: [],
        archTemplate: ArchTemplate.SAAS,
        ambiguityScore: 1.0,
        mermaidDataModel: '',
        apiSpec: { version: '1.0', baseUrl: '', authentication: '', endpoints: [] },
        generatedAt: new Date().toISOString(),
        validationResult: {
          isImplementable: false,
          score: quickCheck.score,
          issues: quickCheck.missing,
          followUpQuestions: quickCheck.missing.map(m => `Please provide more details about: ${m}`),
        },
      }
    }

    const archTemplate = this.selectArchTemplate(extractedData)
    const ambiguityScore = this.calculateAmbiguity(extractedData)

    // Get workflows from extracted data
    const workflows = (extractedData.workflows as Record<string, unknown>) || {}

    // Generate features with specific user stories
    const rawFeatures: PRDFeature[] = (extractedData.features as PRDFeature[]) || []
    const features = this.generateUserStories(rawFeatures, workflows)

    // Generate detailed data model
    const { mermaid: mermaidDataModel, entities } = this.generateDetailedDataModel(extractedData, archTemplate)

    // Generate API spec
    const apiSpec = this.generateAPISpec(features, entities, extractedData)

    // Build content
    const content: PRDContent = {
      overview: this.buildOverview(extractedData, archTemplate),
      problemStatement: this.buildProblemStatement(extractedData, archTemplate),
      targetUsers: this.buildTargetUsers(extractedData, archTemplate),
      features,
      monetization: this.buildMonetization(extractedData, archTemplate),
      constraints: this.buildConstraints(extractedData, archTemplate),
    }

    // Validate the generated PRD
    const validationResult = this.validator.validate(content)

    return {
      content,
      features,
      archTemplate,
      ambiguityScore,
      mermaidDataModel,
      apiSpec,
      generatedAt: new Date().toISOString(),
      validationResult: {
        isImplementable: validationResult.isImplementable,
        score: validationResult.implementabilityScore,
        issues: validationResult.issues.map(i => i.message),
        followUpQuestions: validationResult.followUpQuestions.map(q => q.question),
      },
    }
  }

  // Helper methods for building content
  private buildOverview(data: Record<string, unknown>, arch: ArchTemplate): string {
    const solution = (data.solution_approach as string) || (data.initialDescription as string)
    const projectName = (data.projectName as string) || 'The Project'
    
    if (solution && solution !== 'TBD') {
      return `${projectName} is ${solution}. Built as a ${arch.toLowerCase()} platform, it addresses specific workflow challenges with a focus on user experience and operational efficiency.`
    }
    
    return `${projectName} is a ${arch.toLowerCase()} platform designed to streamline business operations and improve user outcomes.`
  }

  private buildProblemStatement(data: Record<string, unknown>, arch: ArchTemplate): string {
    const problem = (data.business_problem as string) || (data.problemStatement as string)
    if (problem && problem !== 'TBD') return problem

    return `Current workflows for ${arch.toLowerCase()} operations involve significant manual effort, leading to inefficiencies and potential errors. This solution automates and streamlines these processes.`
  }

  private buildTargetUsers(data: Record<string, unknown>, arch: ArchTemplate): string {
    const users = (data.primaryUsers as string)
    const userTypes = (data.userTypes as string[])
    
    if (users && users !== 'TBD') return users
    if (userTypes && userTypes.length > 0) {
      return userTypes.map(t => `${t}s`).join(', ')
    }

    return 'Business users requiring streamlined digital workflows'
  }

  private buildMonetization(data: Record<string, unknown>, arch: ArchTemplate): string {
    const model = (data.businessModel as string)
    if (model && model !== 'TBD') return model

    if (arch === ArchTemplate.SAAS) return 'Subscription-based SaaS model with tiered pricing'
    return 'Standard commercial model appropriate for the market'
  }

  private buildConstraints(data: Record<string, unknown>, arch: ArchTemplate): string[] {
    const constraints = (data.detected_constraints as string[]) || []
    const compliance = (data.complianceNeeds as string[]) || []
    
    return [...constraints, ...compliance]
  }

  private toEntityName(featureName: string): string {
    return featureName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }
}

// Types
interface DataModelEntity {
  name: string
  fields: DataModelField[]
  userRelationship: string
}

interface DataModelField {
  name: string
  type: string
  constraints: string
}

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: string
  request?: {
    query?: string[]
    body?: Array<{ field: string; type: string; required: boolean }>
  }
  response: {
    type: string
    items?: string
  }
}
