import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class DeliveryTransferAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Delivery Transfer Agent',
    name: 'deliveryTransferAgent',
    icon: 'fa:exchange-alt',
    group: ['transform'],
    version: 1,
    description: 'Invites client as collaborator, waits for acceptance, transfers repository ownership',
    defaults: {
      name: 'Delivery Transfer Agent',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Delivery ID',
        name: 'deliveryId',
        type: 'string',
        default: '',
        description: 'The Delivery record ID for status tracking',
      },
      {
        displayName: 'Client GitHub Username',
        name: 'clientGithubUsername',
        type: 'string',
        default: '',
        description: 'GitHub username of the client to invite and transfer to',
      },
      {
        displayName: 'Client GitHub Org',
        name: 'clientGithubOrg',
        type: 'string',
        default: '',
        description: 'Optional: client org to transfer repo to (defaults to personal account)',
      },
      {
        displayName: 'Repo URL',
        name: 'repoUrl',
        type: 'string',
        default: '',
        description: 'Full GitHub URL of the repo to transfer',
      },
      {
        displayName: 'Repo Owner',
        name: 'repoOwner',
        type: 'string',
        default: '',
        description: 'Current repo owner (agency org)',
      },
      {
        displayName: 'Repo Name',
        name: 'repoName',
        type: 'string',
        default: '',
        description: 'Repository name',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const deliveryId = this.getNodeParameter('deliveryId', i) as string
      const clientGithubUsername = this.getNodeParameter('clientGithubUsername', i) as string
      const clientGithubOrg = this.getNodeParameter('clientGithubOrg', i) as string
      const repoUrl = this.getNodeParameter('repoUrl', i) as string
      const repoOwner = this.getNodeParameter('repoOwner', i) as string
      const repoName = this.getNodeParameter('repoName', i) as string

      try {
        const uri = (process.env.DELIVERY_AGENT_URL || 'http://localhost:3001') + '/api/delivery/transfer'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: {
            deliveryId,
            clientGithubUsername,
            clientGithubOrg: clientGithubOrg || undefined,
            repoUrl,
            repoOwner,
            repoName,
          },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            transferStatus: response.transferStatus,
            transferredUrl: response.transferredUrl,
            auditLog: response.auditLog,
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
