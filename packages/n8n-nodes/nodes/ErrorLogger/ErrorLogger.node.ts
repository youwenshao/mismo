import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ErrorLogger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Error Logger',
    name: 'errorLogger',
    icon: 'fa:exclamation-triangle',
    group: ['transform'],
    version: 1,
    description:
      'Logs errors to the centralized error logging service with circuit breaker support',
    defaults: {
      name: 'Error Logger',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        required: true,
        description: 'The Build ID to log the error against',
      },
      {
        displayName: 'Source',
        name: 'source',
        type: 'string',
        default: '',
        required: true,
        description: 'The agent or service that produced the error',
      },
      {
        displayName: 'Error',
        name: 'error',
        type: 'string',
        default: '',
        required: true,
        description: 'The error message to log',
      },
      {
        displayName: 'Context',
        name: 'context',
        type: 'json',
        default: '{}',
        description: 'Optional additional context for the error',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.ERROR_LOGGER_URL || 'http://error-logger:3034'

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const source = this.getNodeParameter('source', i) as string
      const error = this.getNodeParameter('error', i) as string
      const contextRaw = this.getNodeParameter('context', i) as string | object

      const context = typeof contextRaw === 'string' ? JSON.parse(contextRaw) : contextRaw

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/log`,
          body: {
            buildId,
            source,
            error,
            timestamp: new Date().toISOString(),
            context,
          },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            failureCount: response.failureCount,
            circuitBroken: response.circuitBroken,
          },
        })
      } catch (err: unknown) {
        if (this.continueOnFail()) {
          const message = err instanceof Error ? err.message : String(err)
          returnData.push({ json: { success: false, error: message } })
        } else {
          throw err
        }
      }
    }

    return [returnData]
  }
}
