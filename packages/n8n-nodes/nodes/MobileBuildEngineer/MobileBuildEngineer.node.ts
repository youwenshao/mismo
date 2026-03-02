import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class MobileBuildEngineer implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mobile Build Engineer',
    name: 'mobileBuildEngineer',
    icon: 'fa:hammer',
    group: ['transform'],
    version: 1,
    description: 'Executes EAS builds on remote Mac studios and submits to TestFlight/Play Console',
    defaults: {
      name: 'Mobile Build Engineer',
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
        displayName: 'Project Path',
        name: 'projectPath',
        type: 'string',
        default: '',
        description: 'Remote path to the Expo project on the build machine',
      },
      {
        displayName: 'Platform',
        name: 'platform',
        type: 'options',
        options: [
          { name: 'iOS', value: 'ios' },
          { name: 'Android', value: 'android' },
        ],
        default: 'ios',
        description: 'Target platform for the build',
      },
      {
        displayName: 'Build Profile',
        name: 'buildProfile',
        type: 'options',
        options: [
          { name: 'Development', value: 'development' },
          { name: 'Preview', value: 'preview' },
          { name: 'Production', value: 'production' },
        ],
        default: 'production',
        description: 'EAS build profile',
      },
      {
        displayName: 'Credentials',
        name: 'credentials',
        type: 'json',
        default: '{}',
        description: 'Build credentials: appleTeamId, appleApiKeyId, googleServiceAccountKeyPath, expoToken',
      },
      {
        displayName: 'Submit to Store',
        name: 'submitToStore',
        type: 'boolean',
        default: true,
        description: 'Whether to submit the build to TestFlight (iOS) or Play Console (Android)',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const projectPath = this.getNodeParameter('projectPath', i) as string
      const platform = this.getNodeParameter('platform', i) as string
      const buildProfile = this.getNodeParameter('buildProfile', i) as string
      const credentialsRaw = this.getNodeParameter('credentials', i) as string | object
      const submitToStore = this.getNodeParameter('submitToStore', i) as boolean

      try {
        const credentials = typeof credentialsRaw === 'string' ? JSON.parse(credentialsRaw) : credentialsRaw

        const uri = (process.env.MOBILE_BUILD_ENGINEER_URL || 'http://mobile-build-engineer:3022') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, projectPath, platform, buildProfile, credentials, submitToStore },
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
