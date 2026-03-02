import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class MaintenanceChecker implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Maintenance Checker',
    name: 'maintenanceChecker',
    icon: 'fa:wrench',
    group: ['transform'],
    version: 1,
    description: 'Checks repository dependencies for outdated packages and security vulnerabilities',
    defaults: {
      name: 'Maintenance Checker',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'GitHub URL',
        name: 'githubUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'The GitHub repository URL to check',
      },
      {
        displayName: 'Branch',
        name: 'branch',
        type: 'string',
        default: 'main',
        description: 'The branch to check for outdated dependencies',
      },
      {
        displayName: 'Auto-Create PRs',
        name: 'autoCreatePrs',
        type: 'boolean',
        default: true,
        description: 'Automatically create PRs for security patches and minor updates',
      },
      {
        displayName: 'Commission ID',
        name: 'commissionId',
        type: 'string',
        default: '',
        description: 'Optional commission ID to associate with the maintenance check',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (let i = 0; i < items.length; i++) {
      const githubUrl = this.getNodeParameter('githubUrl', i) as string
      const branch = this.getNodeParameter('branch', i) as string
      const autoCreatePrs = this.getNodeParameter('autoCreatePrs', i) as boolean
      const commissionId = this.getNodeParameter('commissionId', i) as string

      try {
        const checkResponse = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/maintenance/check`,
          body: {
            githubUrl,
            branch,
            autoCreatePrs,
            commissionId,
          },
          json: true,
        })

        returnData.push({
          json: {
            success: true,
            githubUrl,
            branch,
            outdatedCount: checkResponse.outdated?.length ?? 0,
            securityIssueCount: checkResponse.securityIssues?.length ?? 0,
            prsCreated: checkResponse.prsCreated ?? [],
            recommendations: checkResponse.recommendations ?? [],
          },
        })
      } catch (err: unknown) {
        if (this.continueOnFail()) {
          const message = err instanceof Error ? err.message : String(err)
          returnData.push({ json: { success: false, error: message, githubUrl } })
        } else {
          throw err
        }
      }
    }

    return [returnData]
  }
}
