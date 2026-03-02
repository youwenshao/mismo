import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeApiError } from 'n8n-workflow'
import { ValidationLayer } from './ValidationLayer'

export class ContentGenerator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Content Generator',
    name: 'contentGenerator',
    icon: 'fa:pen-nib',
    group: ['transform'],
    version: 1,
    description: 'Generates and validates B2B/B2C content from PRD and Business description',
    defaults: {
      name: 'Content Generator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'PRD Text',
        name: 'prdText',
        type: 'string',
        default: '',
        description: 'The technical capabilities from the PRD',
      },
      {
        displayName: 'Business Description',
        name: 'businessDescription',
        type: 'string',
        default: '',
        description: 'The business description to generate content for',
      },
      {
        displayName: 'Target Audience',
        name: 'targetAudience',
        type: 'options',
        options: [
          {
            name: 'B2B',
            value: 'B2B',
          },
          {
            name: 'B2C',
            value: 'B2C',
          },
        ],
        default: 'B2B',
        description: 'Target audience determines readability score validation (B2B <= 12, B2C <= 8)',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const prdText = this.getNodeParameter('prdText', i) as string
      const businessDescription = this.getNodeParameter('businessDescription', i) as string
      const targetAudience = this.getNodeParameter('targetAudience', i) as 'B2B' | 'B2C'

      try {
        // Here we make the LLM call. In a real-world scenario, this would call an LLM API 
        // (e.g. OpenAI or an internal microservice) requesting the "Specificity Formula" 
        // and "So what?" feature format.
        const uri = process.env.LLM_SERVICE_URL || 'http://bmad-validator:3000/generate-content'
        
        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: {
            prdText,
            businessDescription,
            targetAudience,
            prompt: `
              Generate content following these rules:
              1. Headlines: 3 options using 'Specificity Formula' ([Specific metric] + [Timeframe] + [Benefit]).
              2. Features: 'So what?' translation ('You can [action] which means [outcome]'). Max 2 sentences per feature.
              3. Microcopy: CTA buttons, Error messages, Loading states using action-oriented language.
            `
          },
          json: true,
        })

        // Assuming response returns a JSON structure with { headlines: string[], features: string[], microcopy: any }
        // We validate the generated text by combining it.
        const allTextToValidate = [
          ...(response.headlines || []),
          ...(response.features || []),
          JSON.stringify(response.microcopy || {})
        ].join(' ')

        const validationResult = ValidationLayer.validate(allTextToValidate, targetAudience)

        if (!validationResult.isValid) {
          throw new NodeApiError(this.getNode(), { error: validationResult.errors.join(' | ') } as any, {
            message: 'Content validation failed',
            description: validationResult.errors.join(' | ')
          })
        }

        returnData.push({
          json: {
            content: {
              headlines: response.headlines,
              features: response.features,
              microcopy: response.microcopy,
            }
          },
        })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } })
        } else {
          // If it's already a NodeApiError, throw it directly
          if (error instanceof NodeApiError) {
            throw error;
          }
          throw new NodeApiError(this.getNode(), error)
        }
      }
    }

    return [returnData]
  }
}
