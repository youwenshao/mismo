import type { PRDContent, PRDFeature, UserStory } from '@mismo/shared'
import {
  type ValidationResult,
  type ValidationIssue,
  type FeatureValidationResult,
  type DataModelValidationResult,
  type ApiSpecValidationResult,
  type BusinessLogicValidationResult,
  type FollowUpQuestion,
  type ValidationConfig,
  ValidationSeverity,
  ValidationCategory,
  DEFAULT_VALIDATION_CONFIG,
  GENERIC_FIELD_PATTERNS,
  GENERIC_DESCRIPTION_PATTERNS,
  PLACEHOLDER_PATTERNS,
  AMBIGUOUS_TERMS,
} from './types'
import {
  FEATURE_DESCRIPTION_CRITERIA,
  USER_STORY_CRITERIA,
  DATA_MODEL_CRITERIA,
  CLARITY_GATES,
  FEASIBILITY_INDICATORS,
  INCOMPLETE_PATTERNS,
  VALIDATION_QUESTIONS,
  SCORING_WEIGHTS,
  SEVERITY_WEIGHTS,
} from './rubric'

const VALIDATOR_VERSION = '1.0.0'

/**
 * PRD Validator - Main validation engine
 * 
 * Validates PRDs across multiple dimensions to ensure they are
 * implementable by coding agents without excessive assumptions.
 */
export class PRDValidator {
  private config: ValidationConfig

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config }
  }

  /**
   * Main validation entry point
   */
  validate(prd: PRDContent): ValidationResult {
    const issues: ValidationIssue[] = []
    
    // Run all validation phases
    const syntacticResult = this.validateSyntactic(prd)
    const semanticResult = this.validateSemantic(prd)
    const featureResults = this.validateFeatures(prd.features)
    const dataModelResult = this.validateDataModel(prd)
    const apiSpecResult = this.validateApiSpec(prd)
    const businessLogicResult = this.validateBusinessLogic(prd)
    const clarityResult = this.validateClarity(prd)
    const feasibilityResult = this.validateFeasibility(prd)
    
    // Collect all issues
    issues.push(...syntacticResult.issues)
    issues.push(...semanticResult.issues)
    featureResults.forEach(f => issues.push(...f.issues))
    issues.push(...dataModelResult.issues)
    issues.push(...apiSpecResult.issues)
    issues.push(...businessLogicResult.issues)
    issues.push(...clarityResult.issues)
    issues.push(...feasibilityResult.issues)
    
    // Calculate scores
    const scores = this.calculateScores({
      syntactic: syntacticResult.score,
      semantic: semanticResult.score,
      clarity: clarityResult.score,
      features: this.calculateFeatureScore(featureResults),
      dataModel: dataModelResult.score,
      apiSpec: apiSpecResult.score,
      businessLogic: businessLogicResult.score,
    })
    
    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(issues, featureResults, prd)
    
    // Determine implementability
    const criticalCount = issues.filter(i => i.severity === ValidationSeverity.CRITICAL).length
    const highCount = issues.filter(i => i.severity === ValidationSeverity.HIGH).length
    
    const isImplementable = 
      scores.overall >= this.config.minImplementabilityScore &&
      criticalCount <= this.config.maxCriticalIssues &&
      highCount <= this.config.maxHighIssues
    
    return {
      isValid: syntacticResult.score >= 90,
      isImplementable,
      implementabilityScore: scores.overall,
      scores,
      issues,
      featureResults,
      dataModelResult,
      apiSpecResult,
      businessLogicResult,
      followUpQuestions,
      requiredInterviewerActions: this.generateRequiredActions(issues, followUpQuestions),
      validatedAt: new Date().toISOString(),
      validatorVersion: VALIDATOR_VERSION,
    }
  }

  // ============================================================================
  // SYNTACTIC VALIDATION - Structure and schema compliance
  // ============================================================================
  
  private validateSyntactic(prd: PRDContent): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = []
    let score = 100
    
    // Check required top-level fields
    if (!prd.overview || prd.overview.length < 50) {
      issues.push({
        id: 'SYN-001',
        severity: ValidationSeverity.CRITICAL,
        category: ValidationCategory.SYNTACTIC,
        field: 'overview',
        message: 'Overview is missing or too short (< 50 chars)',
        suggestion: 'Provide 2-3 paragraphs describing the project purpose and value proposition',
        examples: {
          bad: 'A project management app',
          good: 'TaskFlow is a collaborative project management platform designed for remote development teams. It combines Kanban boards, sprint planning, and real-time messaging to streamline agile workflows. Teams can track progress, assign tasks, and automate status updates based on GitHub commits.',
        },
      })
      score -= 25
    }
    
    if (!prd.problemStatement || prd.problemStatement.length < 30) {
      issues.push({
        id: 'SYN-002',
        severity: ValidationSeverity.CRITICAL,
        category: ValidationCategory.SYNTACTIC,
        field: 'problemStatement',
        message: 'Problem statement is missing or too vague',
        suggestion: 'Describe the specific pain point and who experiences it',
        examples: {
          bad: 'Teams need better organization',
          good: 'Remote development teams waste 4+ hours weekly on status updates across Slack, Jira, and GitHub. Information gets lost, leading to missed deadlines and duplicated work.',
        },
      })
      score -= 25
    }
    
    if (!prd.targetUsers || prd.targetUsers.length < 20) {
      issues.push({
        id: 'SYN-003',
        severity: ValidationSeverity.HIGH,
        category: ValidationCategory.SYNTACTIC,
        field: 'targetUsers',
        message: 'Target users not defined',
        suggestion: 'Define 2-3 specific user personas with roles and needs',
      })
      score -= 15
    }
    
    if (!Array.isArray(prd.features) || prd.features.length === 0) {
      issues.push({
        id: 'SYN-004',
        severity: ValidationSeverity.CRITICAL,
        category: ValidationCategory.SYNTACTIC,
        field: 'features',
        message: 'No features defined',
        suggestion: 'Define at least one MUST-HAVE feature with detailed description',
      })
      score -= 30
    }
    
    return { score: Math.max(0, score), issues }
  }

  // ============================================================================
  // SEMANTIC VALIDATION - Content quality
  // ============================================================================
  
  private validateSemantic(prd: PRDContent): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = []
    let score = 100
    
    // Check for placeholders in content
    const allText = JSON.stringify(prd).toLowerCase()
    
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(allText)) {
        issues.push({
          id: 'SEM-001',
          severity: ValidationSeverity.CRITICAL,
          category: ValidationCategory.SEMANTIC,
          message: 'PRD contains placeholder text (TBD, XXX, etc.)',
          suggestion: 'Replace all placeholders with specific information or decisions',
        })
        score -= 20
        break
      }
    }
    
    // Check for generic descriptions
    for (const pattern of GENERIC_DESCRIPTION_PATTERNS) {
      if (pattern.test(prd.overview)) {
        issues.push({
          id: 'SEM-002',
          severity: ValidationSeverity.HIGH,
          category: ValidationCategory.SEMANTIC,
          field: 'overview',
          message: 'Overview uses generic language',
          suggestion: 'Be specific about what the product does and how it works',
        })
        score -= 15
        break
      }
    }
    
    return { score: Math.max(0, score), issues }
  }

  // ============================================================================
  // FEATURE VALIDATION - Per-feature completeness
  // ============================================================================
  
  private validateFeatures(features: PRDFeature[]): FeatureValidationResult[] {
    return features.map(feature => this.validateFeature(feature))
  }
  
  private validateFeature(feature: PRDFeature): FeatureValidationResult {
    const issues: ValidationIssue[] = []
    const completeness = {
      hasDescription: false,
      hasUserStories: false,
      hasBusinessRules: false,
      hasDataModel: false,
      hasApiSpec: false,
      hasUiSpec: false,
    }
    
    let score = 100
    
    // Validate description using criteria
    const descResults = FEATURE_DESCRIPTION_CRITERIA.map(c => c.evaluate(feature.description))
    const descScore = descResults.reduce((sum, r, i) => sum + r.score * FEATURE_DESCRIPTION_CRITERIA[i].weight, 0)
    completeness.hasDescription = descScore >= 0.7
    
    if (!completeness.hasDescription) {
      const failedCriteria = FEATURE_DESCRIPTION_CRITERIA.filter((c, i) => descResults[i].score < 0.5)
      issues.push({
        id: 'FEAT-001',
        severity: feature.priority === 'must-have' ? ValidationSeverity.CRITICAL : ValidationSeverity.HIGH,
        category: ValidationCategory.COMPLETENESS,
        feature: feature.name,
        field: 'description',
        message: `Feature "${feature.name}" description is insufficient`,
        details: failedCriteria.map(c => c.name).join(', '),
        suggestion: `Expand description to include: ${failedCriteria.map(c => c.name).join(', ')}`,
        examples: {
          bad: feature.description,
          good: 'Users can create project timelines by dragging tasks onto a calendar. Each task can have subtasks, dependencies, and assigned team members. The system automatically highlights conflicts when deadlines overlap. Notifications are sent 24 hours before due dates.',
        },
      })
      score -= 20
    }
    
    // Check for generic patterns in description
    for (const pattern of INCOMPLETE_PATTERNS) {
      if (pattern.pattern.test(feature.description)) {
        issues.push({
          id: `FEAT-PATTERN-${pattern.id}`,
          severity: pattern.severity,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          message: pattern.message,
          suggestion: pattern.suggestion,
        })
        score -= SEVERITY_WEIGHTS[pattern.severity]
      }
    }
    
    // Validate user stories
    if (!feature.userStories || feature.userStories.length === 0) {
      issues.push({
        id: 'FEAT-002',
        severity: feature.priority === 'must-have' ? ValidationSeverity.CRITICAL : ValidationSeverity.HIGH,
        category: ValidationCategory.COMPLETENESS,
        feature: feature.name,
        field: 'userStories',
        message: `Feature "${feature.name}" has no user stories`,
        suggestion: `Add ${this.getMinStoriesForPriority(feature.priority)} user stories in Gherkin format (Given/When/Then)`,
      })
      score -= 25
    } else {
      const minStories = this.getMinStoriesForPriority(feature.priority)
      if (feature.userStories.length < minStories) {
        issues.push({
          id: 'FEAT-003',
          severity: ValidationSeverity.MEDIUM,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          field: 'userStories',
          message: `Feature "${feature.name}" has only ${feature.userStories.length} user stories (expected ${minStories})`,
          suggestion: `Add ${minStories - feature.userStories.length} more user stories covering error cases and edge cases`,
        })
        score -= 10
      }
      
      // Validate each user story
      completeness.hasUserStories = true
      feature.userStories.forEach((story, idx) => {
        const storyIssues = this.validateUserStory(story, feature.name, idx)
        issues.push(...storyIssues)
        if (storyIssues.length > 0) {
          score -= 5
        }
      })
    }
    
    return {
      feature,
      score: Math.max(0, score),
      isComplete: score >= 70 && issues.filter(i => i.severity === ValidationSeverity.CRITICAL).length === 0,
      issues,
      completeness,
    }
  }
  
  private validateUserStory(story: UserStory, featureName: string, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    const storyResults = USER_STORY_CRITERIA.map(c => c.evaluate(story))
    
    storyResults.forEach((result, idx) => {
      if (!result.passed) {
        const criterion = USER_STORY_CRITERIA[idx]
        issues.push({
          id: `STORY-${criterion.id}`,
          severity: ValidationSeverity.HIGH,
          category: ValidationCategory.CLARITY,
          feature: featureName,
          field: `userStories[${index}]`,
          message: `User story "${story.title}" fails: ${criterion.name}`,
          details: result.details,
          suggestion: criterion.id === 'NO_TEMPLATE' 
            ? 'Rewrite with specific details for this feature'
            : `Add ${criterion.name.toLowerCase()}`,
        })
      }
    })
    
    return issues
  }
  
  private getMinStoriesForPriority(priority: string): number {
    switch (priority) {
      case 'must-have': return this.config.minUserStoriesPerMustHaveFeature
      case 'should-have': return this.config.minUserStoriesPerShouldHaveFeature
      default: return 1
    }
  }

  // ============================================================================
  // DATA MODEL VALIDATION
  // ============================================================================
  
  private validateDataModel(prd: PRDContent): DataModelValidationResult {
    const issues: ValidationIssue[] = []
    const entities: DataModelValidationResult['entities'] = []
    let score = 100
    
    // Extract entities from features (simplified - in practice would parse mermaid or explicit schema)
    const entityNames = prd.features.map(f => this.toEntityName(f.name))
    
    if (entityNames.length === 0) {
      issues.push({
        id: 'DM-001',
        severity: ValidationSeverity.CRITICAL,
        category: ValidationCategory.COMPLETENESS,
        message: 'No entities identified from features',
        suggestion: 'Define features that imply data entities (e.g., "Manage Projects" implies a Project entity)',
      })
      score -= 30
    }
    
    // For each feature, infer entity and validate
    prd.features.forEach(feature => {
      const entityName = this.toEntityName(feature.name)
      
      // Infer fields from description
      const inferredFields = this.inferFieldsFromDescription(feature.description)
      
      // Count generic fields
      const genericCount = inferredFields.filter(f => 
        GENERIC_FIELD_PATTERNS.some(p => p.test(f.name))
      ).length
      const genericRatio = inferredFields.length > 0 ? genericCount / inferredFields.length : 1
      
      const entityIssues: ValidationIssue[] = []
      
      if (inferredFields.length < this.config.minFieldsPerEntity) {
        entityIssues.push({
          id: 'DM-FIELDS',
          severity: ValidationSeverity.HIGH,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          message: `Entity "${entityName}" has only ${inferredFields.length} fields (inferred)`,
          suggestion: `Define at least ${this.config.minFieldsPerEntity} fields including domain-specific ones`,
        })
      }
      
      if (genericRatio > this.config.maxGenericFieldRatio) {
        entityIssues.push({
          id: 'DM-GENERIC',
          severity: ValidationSeverity.CRITICAL,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          message: `Entity "${entityName}" has ${Math.round(genericRatio * 100)}% generic fields`,
          suggestion: 'Add domain-specific fields beyond id, title, status, metadata. What makes this entity unique?',
          examples: {
            bad: 'id, userId, title, status, metadata',
            good: 'id, organizationId, name, description, status (enum: draft, active, archived), priority (1-5), dueDate, budget (decimal), ownerId, settings (JSON), createdAt, updatedAt',
          },
        })
        score -= 20
      }
      
      entities.push({
        name: entityName,
        isComplete: inferredFields.length >= this.config.minFieldsPerEntity && genericRatio <= this.config.maxGenericFieldRatio,
        hasId: inferredFields.some(f => /^id$/i.test(f.name)),
        hasTimestamps: inferredFields.some(f => /createdAt|updatedAt/i.test(f.name)),
        fieldCount: inferredFields.length,
        genericFieldRatio: genericRatio,
        issues: entityIssues,
      })
      
      issues.push(...entityIssues)
    })
    
    return {
      score: Math.max(0, score),
      issues,
      entities,
    }
  }
  
  private toEntityName(featureName: string): string {
    return featureName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  }
  
  private inferFieldsFromDescription(description: string): Array<{ name: string; type?: string }> {
    // Simple field inference from description
    const fields: Array<{ name: string; type?: string }> = [
      { name: 'id', type: 'string' },
    ]
    
    // Look for field indicators in description
    const fieldPatterns = [
      { pattern: /\b(name|title)\b/i, field: 'name', type: 'string' },
      { pattern: /\b(description|content|body|text)\b/i, field: 'description', type: 'text' },
      { pattern: /\b(status|state|phase)\b/i, field: 'status', type: 'enum' },
      { pattern: /\b(date|time|deadline|due)\b/i, field: 'dueDate', type: 'datetime' },
      { pattern: /\b(priority|level|order)\b/i, field: 'priority', type: 'integer' },
      { pattern: /\b(amount|price|cost|budget|fee)\b/i, field: 'budget', type: 'decimal' },
      { pattern: /\b(owner|user|creator|author|assignee)\b/i, field: 'ownerId', type: 'string' },
      { pattern: /\b(tag|label|category|type)\b/i, field: 'tags', type: 'array' },
    ]
    
    for (const { pattern, field, type } of fieldPatterns) {
      if (pattern.test(description) && !fields.some(f => f.name === field)) {
        fields.push({ name: field, type })
      }
    }
    
    fields.push({ name: 'createdAt', type: 'datetime' })
    fields.push({ name: 'updatedAt', type: 'datetime' })
    
    return fields
  }

  // ============================================================================
  // API SPEC VALIDATION
  // ============================================================================
  
  private validateApiSpec(prd: PRDContent): ApiSpecValidationResult {
    const issues: ValidationIssue[] = []
    const endpoints: ApiSpecValidationResult['endpoints'] = []
    let score = 100
    
    // Check if API is explicitly documented
    const hasApiSection = JSON.stringify(prd).toLowerCase().includes('api') ||
                          JSON.stringify(prd).toLowerCase().includes('endpoint')
    
    if (!hasApiSection && this.config.requireApiDocumentation) {
      issues.push({
        id: 'API-001',
        severity: ValidationSeverity.HIGH,
        category: ValidationCategory.COMPLETENESS,
        message: 'No API specification found',
        suggestion: 'Document key endpoints for each feature with request/response formats',
      })
      score -= 20
    }
    
    // Infer endpoints from features
    prd.features.forEach(feature => {
      const entityName = this.toEntityName(feature.name).toLowerCase()
      
      // Standard REST endpoints
      const inferredEndpoints = [
        { path: `/api/${entityName}s`, method: 'GET', isDocumented: false },
        { path: `/api/${entityName}s`, method: 'POST', isDocumented: false },
        { path: `/api/${entityName}s/:id`, method: 'GET', isDocumented: false },
        { path: `/api/${entityName}s/:id`, method: 'PATCH', isDocumented: false },
        { path: `/api/${entityName}s/:id`, method: 'DELETE', isDocumented: false },
      ]
      
      endpoints.push(...inferredEndpoints.map(e => ({
        ...e,
        hasRequestSchema: false,
        hasResponseSchema: false,
        hasErrorHandling: false,
      })))
    })
    
    if (endpoints.length === 0) {
      issues.push({
        id: 'API-002',
        severity: ValidationSeverity.HIGH,
        category: ValidationCategory.COMPLETENESS,
        message: 'Could not infer any API endpoints from features',
        suggestion: 'Features should imply API operations (create, read, update, delete)',
      })
      score -= 15
    }
    
    return {
      score: Math.max(0, score),
      issues,
      endpoints,
    }
  }

  // ============================================================================
  // BUSINESS LOGIC VALIDATION
  // ============================================================================
  
  private validateBusinessLogic(prd: PRDContent): BusinessLogicValidationResult {
    const issues: ValidationIssue[] = []
    const rules: BusinessLogicValidationResult['rules'] = []
    let score = 100
    
    // Check for business rules in descriptions
    prd.features.forEach(feature => {
      const desc = feature.description.toLowerCase()
      
      // Look for rule indicators
      const hasRules = /\b(only|must|should|cannot|required|allowed|if|when|before|after|unless)\b/.test(desc)
      const hasQuantifiedRules = /\b\d+\b/.test(desc) && /\b(only|max|min|limit|at least|at most)\b/.test(desc)
      
      rules.push({
        feature: feature.name,
        rule: hasRules ? 'Rules detected in description' : 'No explicit rules found',
        isQuantified: hasQuantifiedRules,
        hasConditions: /\b(if|when|unless)\b/i.test(desc),
        hasTriggers: /\b(on|after|before|upon)\b/i.test(desc),
      })
      
      if (!hasRules && feature.priority === 'must-have') {
        issues.push({
          id: 'BL-001',
          severity: ValidationSeverity.MEDIUM,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          message: `Feature "${feature.name}" has no documented business rules`,
          suggestion: 'Document validation rules, permissions, state transitions, and calculations',
          examples: {
            bad: 'Users can create tasks',
            good: 'Users can create tasks. Task title is required (3-100 chars). Due date must be in the future. Max 50 tasks per project. Only project members can create tasks.',
          },
        })
        score -= 10
      }
      
      if (this.config.requireQuantifiedRules && !hasQuantifiedRules) {
        issues.push({
          id: 'BL-002',
          severity: ValidationSeverity.LOW,
          category: ValidationCategory.COMPLETENESS,
          feature: feature.name,
          message: `Feature "${feature.name}" lacks quantified rules`,
          suggestion: 'Add specific limits: character counts, number ranges, time limits',
        })
      }
    })
    
    return {
      score: Math.max(0, score),
      issues,
      rules,
    }
  }

  // ============================================================================
  // CLARITY VALIDATION
  // ============================================================================
  
  private validateClarity(prd: PRDContent): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = []
    let score = 100
    
    const allText = JSON.stringify(prd)
    
    // Run clarity gates
    for (const gate of CLARITY_GATES) {
      const result = gate.test(allText)
      if (!result.passed) {
        issues.push({
          id: `CLARITY-${gate.id}`,
          severity: ValidationSeverity.MEDIUM,
          category: ValidationCategory.CLARITY,
          message: gate.name,
          suggestion: result.issues.join('; '),
        })
        score -= 10
      }
    }
    
    // Check for ambiguous terms
    const foundAmbiguous = AMBIGUOUS_TERMS.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(allText)
    )
    
    if (foundAmbiguous.length > 0) {
      issues.push({
        id: 'CLARITY-AMBIGUOUS',
        severity: ValidationSeverity.MEDIUM,
        category: ValidationCategory.CLARITY,
        message: `Found ${foundAmbiguous.length} ambiguous terms`,
        details: foundAmbiguous.join(', '),
        suggestion: 'Replace with specific quantities, conditions, or examples',
      })
      score -= 5 * foundAmbiguous.length
    }
    
    return { score: Math.max(0, score), issues }
  }

  // ============================================================================
  // FEASIBILITY VALIDATION
  // ============================================================================
  
  private validateFeasibility(prd: PRDContent): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = []
    
    // Run feasibility indicators
    for (const indicator of FEASIBILITY_INDICATORS) {
      const result = indicator.extract(prd)
      
      if (!result.present) {
        issues.push({
          id: `FEAS-${indicator.id}`,
          severity: ValidationSeverity.INFO,
          category: ValidationCategory.FEASIBILITY,
          message: `${indicator.name} not specified`,
          suggestion: `Consider documenting ${indicator.name.toLowerCase()} for better technical planning`,
        })
      }
    }
    
    return { score: 100, issues }
  }

  // ============================================================================
  // SCORING CALCULATION
  // ============================================================================
  
  private calculateScores(componentScores: {
    syntactic: number
    semantic: number
    clarity: number
    features: number
    dataModel: number
    apiSpec: number
    businessLogic: number
  }) {
    const overall = Math.round(
      componentScores.features * SCORING_WEIGHTS.features +
      componentScores.dataModel * SCORING_WEIGHTS.dataModel +
      componentScores.apiSpec * SCORING_WEIGHTS.apiSpec +
      componentScores.businessLogic * SCORING_WEIGHTS.businessLogic +
      componentScores.clarity * SCORING_WEIGHTS.clarity
    )
    
    return {
      overall,
      syntactic: componentScores.syntactic,
      semantic: componentScores.semantic,
      completeness: Math.round((componentScores.features + componentScores.dataModel + componentScores.apiSpec + componentScores.businessLogic) / 4),
      clarity: componentScores.clarity,
      feasibility: 100, // Info level only
      features: componentScores.features,
      dataModel: componentScores.dataModel,
      apiSpec: componentScores.apiSpec,
      businessLogic: componentScores.businessLogic,
    }
  }
  
  private calculateFeatureScore(results: FeatureValidationResult[]): number {
    if (results.length === 0) return 0
    const total = results.reduce((sum, r) => sum + r.score, 0)
    return Math.round(total / results.length)
  }

  // ============================================================================
  // FOLLOW-UP QUESTION GENERATION
  // ============================================================================
  
  private generateFollowUpQuestions(
    issues: ValidationIssue[],
    featureResults: FeatureValidationResult[],
    prd: PRDContent
  ): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = []
    
    // Map issues to relevant validation questions
    for (const issue of issues) {
      const relevantQuestions = this.findRelevantQuestions(issue)
      questions.push(...relevantQuestions)
    }
    
    // Add feature-specific questions for incomplete features
    for (const result of featureResults) {
      if (!result.isComplete) {
        const missing = Object.entries(result.completeness)
          .filter(([, has]) => !has)
          .map(([key]) => key)
        
        if (missing.includes('hasDescription')) {
          questions.push({
            id: `Q-DESC-${result.feature.name}`,
            priority: 'must-answer',
            category: 'Feature Description',
            question: `What specific actions can users perform with "${result.feature.name}"?`,
            context: `The description for "${result.feature.name}" needs more detail`,
            targetField: `${result.feature.name}.description`,
            exampleAnswer: 'Users can create a new project by entering a name and optional description. They can set a due date, assign team members with roles (admin, editor, viewer), upload files up to 50MB, and choose from 5 project templates.',
          })
        }
        
        if (missing.includes('hasUserStories')) {
          questions.push({
            id: `Q-STORY-${result.feature.name}`,
            priority: 'must-answer',
            category: 'User Stories',
            question: `Walk me through the main user flow for "${result.feature.name}" step by step.`,
            context: `Need detailed user stories for "${result.feature.name}"`,
            targetField: `${result.feature.name}.userStories`,
            exampleAnswer: '1. User clicks "New Project" button 2. Fills project name (required) and description (optional) 3. Selects due date from calendar picker 4. Clicks "Create" 5. System validates and creates project 6. User is redirected to the new project dashboard',
          })
        }
      }
    }
    
    // Deduplicate by ID
    const seen = new Set<string>()
    return questions.filter(q => {
      if (seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })
  }
  
  private findRelevantQuestions(issue: ValidationIssue): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = []
    
    // Map issue patterns to validation questions
    const mappings: Array<{ pattern: RegExp; questionIds: string[] }> = [
      { pattern: /description/i, questionIds: ['FQ1', 'FQ2', 'FQ3'] },
      { pattern: /user story/i, questionIds: ['FQ3', 'FQ9'] },
      { pattern: /data|field|entity/i, questionIds: ['FQ2', 'DM1', 'DM2'] },
      { pattern: /api|endpoint/i, questionIds: ['API1', 'API2', 'API3'] },
      { pattern: /rule|permission|validation/i, questionIds: ['FQ4', 'FQ5'] },
      { pattern: /error|handle/i, questionIds: ['FQ6', 'FQ9', 'API3'] },
      { pattern: /integration/i, questionIds: ['FQ7'] },
      { pattern: /performance|scale/i, questionIds: ['FQ8'] },
    ]
    
    for (const mapping of mappings) {
      if (mapping.pattern.test(issue.message + ' ' + (issue.field || ''))) {
        for (const qid of mapping.questionIds) {
          const vq = VALIDATION_QUESTIONS.find(q => q.id === qid)
          if (vq) {
            questions.push({
              id: `${qid}-${issue.id}`,
              priority: issue.severity === ValidationSeverity.CRITICAL ? 'must-answer' : 'should-answer',
              category: vq.category,
              question: vq.question,
              context: `Related to: ${issue.message}`,
              targetField: issue.feature || issue.field,
              exampleAnswer: vq.exampleGoodAnswer,
            })
          }
        }
      }
    }
    
    return questions
  }
  
  private generateRequiredActions(issues: ValidationIssue[], questions: FollowUpQuestion[]): string[] {
    const actions: string[] = []
    
    const criticalIssues = issues.filter(i => i.severity === ValidationSeverity.CRITICAL)
    if (criticalIssues.length > 0) {
      actions.push(`Address ${criticalIssues.length} critical issues before proceeding`)
    }
    
    const mustAnswerQuestions = questions.filter(q => q.priority === 'must-answer')
    if (mustAnswerQuestions.length > 0) {
      actions.push(`Answer ${mustAnswerQuestions.length} must-answer questions`)
    }
    
    const incompleteFeatures = issues.filter(i => 
      i.category === ValidationCategory.COMPLETENESS && i.feature
    )
    if (incompleteFeatures.length > 0) {
      const featureNames = [...new Set(incompleteFeatures.map(i => i.feature))]
      actions.push(`Complete specification for features: ${featureNames.join(', ')}`)
    }
    
    return actions
  }
}

// Factory function for convenience
export function validatePRD(prd: PRDContent, config?: Partial<ValidationConfig>): ValidationResult {
  const validator = new PRDValidator(config)
  return validator.validate(prd)
}
