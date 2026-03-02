import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class MobileScaffoldAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mobile Scaffold Agent',
    name: 'mobileScaffoldAgent',
    icon: 'fa:mobile',
    group: ['transform'],
    version: 1,
    description: 'Generates Expo project structure, navigation, app.json, and state management setup',
    defaults: {
      name: 'Mobile Scaffold Agent',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for audit logging',
      },
      {
        displayName: 'Project Name',
        name: 'projectName',
        type: 'string',
        default: '',
        description: 'Name of the Expo project',
      },
      {
        displayName: 'Bundle ID',
        name: 'bundleId',
        type: 'string',
        default: '',
        description: 'iOS bundle identifier and Android package name (e.g. com.company.app)',
      },
      {
        displayName: 'PRD',
        name: 'prd',
        type: 'json',
        default: '{}',
        description: 'PRD with screens, dataModels, and features',
      },
      {
        displayName: 'Design DNA',
        name: 'designDna',
        type: 'json',
        default: '{}',
        description: 'Design DNA tokens for theming',
      },
      {
        displayName: 'Architecture Decision',
        name: 'architectureDecision',
        type: 'json',
        default: '{}',
        description: 'Output from MobileFeasibilityChecker',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const projectName = this.getNodeParameter('projectName', i) as string
      const bundleId = this.getNodeParameter('bundleId', i) as string
      const prdRaw = this.getNodeParameter('prd', i) as string | object
      const designDnaRaw = this.getNodeParameter('designDna', i) as string | object
      const archDecisionRaw = this.getNodeParameter('architectureDecision', i) as string | object

      try {
        const prd = typeof prdRaw === 'string' ? JSON.parse(prdRaw) : prdRaw
        const designDna = typeof designDnaRaw === 'string' ? JSON.parse(designDnaRaw) : designDnaRaw
        const architectureDecision = typeof archDecisionRaw === 'string' ? JSON.parse(archDecisionRaw) : archDecisionRaw

        const uri = (process.env.MOBILE_SCAFFOLD_URL || 'http://mobile-scaffold:3020') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, projectName, bundleId, prd, designDna, architectureDecision },
          json: true,
        })

        returnData.push({ json: response })
      } catch (error: unknown) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : String(error)
          returnData.push({ json: { success: false, error: message } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
