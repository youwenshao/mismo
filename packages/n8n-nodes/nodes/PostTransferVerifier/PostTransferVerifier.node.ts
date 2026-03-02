import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class PostTransferVerifier implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Post-Transfer Verifier',
    name: 'postTransferVerifier',
    icon: 'fa:check-double',
    group: ['transform'],
    version: 1,
    description: 'Verifies client has admin access, repo is accessible, env contracts match, and deployed app is healthy',
    defaults: {
      name: 'Post-Transfer Verifier',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Delivery ID',
        name: 'deliveryId',
        type: 'string',
        default: '',
        description: 'The Delivery record ID',
      },
      {
        displayName: 'Transferred Repo URL',
        name: 'transferredUrl',
        type: 'string',
        default: '',
        description: 'URL of the transferred repository',
      },
      {
        displayName: 'Client GitHub Username',
        name: 'clientUsername',
        type: 'string',
        default: '',
        description: 'GitHub username of the client',
      },
      {
        displayName: 'Repo Owner',
        name: 'repoOwner',
        type: 'string',
        default: '',
        description: 'New repo owner after transfer',
      },
      {
        displayName: 'Repo Name',
        name: 'repoName',
        type: 'string',
        default: '',
        description: 'Repository name',
      },
      {
        displayName: 'Deployed URL',
        name: 'deployedUrl',
        type: 'string',
        default: '',
        description: 'Optional deployed application URL for health check',
      },
      {
        displayName: 'Required Env Vars',
        name: 'requiredEnvVars',
        type: 'json',
        default: '[]',
        description: 'JSON array of required environment variable names',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const deliveryId = this.getNodeParameter('deliveryId', i) as string
      const transferredUrl = this.getNodeParameter('transferredUrl', i) as string
      const clientUsername = this.getNodeParameter('clientUsername', i) as string
      const repoOwner = this.getNodeParameter('repoOwner', i) as string
      const repoName = this.getNodeParameter('repoName', i) as string
      const deployedUrl = this.getNodeParameter('deployedUrl', i) as string
      const requiredEnvVarsRaw = this.getNodeParameter('requiredEnvVars', i) as string

      try {
        const requiredEnvVars = typeof requiredEnvVarsRaw === 'string' ? JSON.parse(requiredEnvVarsRaw) : requiredEnvVarsRaw

        const uri = (process.env.DELIVERY_AGENT_URL || 'http://localhost:3001') + '/api/delivery/verify'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: {
            deliveryId,
            transferredRepoUrl: transferredUrl,
            clientGithubUsername: clientUsername,
            repoOwner,
            repoName,
            deployedUrl: deployedUrl || undefined,
            requiredEnvVars,
          },
          json: true,
        })

        returnData.push({
          json: {
            success: response.allPassed,
            allPassed: response.allPassed,
            checks: response.checks,
            rollbackPlan: response.rollbackPlan,
          },
        })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message, allPassed: false } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
