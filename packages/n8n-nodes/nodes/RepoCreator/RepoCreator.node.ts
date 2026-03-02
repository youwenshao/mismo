import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class RepoCreator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Repo Creator',
    name: 'repoCreator',
    icon: 'fa:code-branch',
    group: ['transform'],
    version: 1,
    description: 'Creates a GitHub repository under the agency org, pushes build code, sets up branch protection',
    defaults: {
      name: 'Repo Creator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Build ID for audit logging',
      },
      {
        displayName: 'Commission ID',
        name: 'commissionId',
        type: 'string',
        default: '',
        description: 'The Commission ID',
      },
      {
        displayName: 'Repo Name',
        name: 'repoName',
        type: 'string',
        default: '',
        description: 'Name for the new GitHub repository',
      },
      {
        displayName: 'GitHub Org',
        name: 'githubOrg',
        type: 'string',
        default: '',
        description: 'GitHub organization to create the repo under (defaults to GITHUB_DELIVERY_ORG)',
      },
      {
        displayName: 'Workspace Directory',
        name: 'workspaceDir',
        type: 'string',
        default: '',
        description: 'Path to the build workspace containing source code',
      },
      {
        displayName: 'Template ID',
        name: 'templateId',
        type: 'string',
        default: '',
        description: 'Optional template repository ID for scaffolding',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const commissionId = this.getNodeParameter('commissionId', i) as string
      const repoName = this.getNodeParameter('repoName', i) as string
      const githubOrg = this.getNodeParameter('githubOrg', i) as string
      const workspaceDir = this.getNodeParameter('workspaceDir', i) as string
      const templateId = this.getNodeParameter('templateId', i) as string

      try {
        const uri = (process.env.DELIVERY_AGENT_URL || 'http://localhost:3001') + '/api/delivery/create-repo'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: {
            buildId,
            commissionId,
            repoName,
            githubOrg: githubOrg || undefined,
            workspaceDir,
            templateId: templateId || undefined,
          },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            repoUrl: response.repoUrl,
            repoOwner: response.repoOwner,
            repoName: response.repoName,
          },
        })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message, success: false } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
