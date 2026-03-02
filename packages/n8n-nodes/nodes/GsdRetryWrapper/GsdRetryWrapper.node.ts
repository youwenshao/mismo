import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

async function logRetryError(
  helpers: IExecuteFunctions['helpers'],
  buildId: string,
  serviceUrl: string,
  errorEntry: { attempt: number; message: string; timestamp: string },
): Promise<void> {
  const errorLoggerBase = process.env.ERROR_LOGGER_URL || 'http://error-logger:3000'

  try {
    await helpers.request({
      method: 'POST',
      uri: `${errorLoggerBase}/log`,
      body: {
        buildId,
        serviceUrl,
        attempt: errorEntry.attempt,
        error: errorEntry.message,
        timestamp: errorEntry.timestamp,
      },
      json: true,
    })
  } catch {
    // Best-effort logging — don't let logger failures derail retries
  }
}

export class GsdRetryWrapper implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GSD Retry Wrapper',
    name: 'gsdRetryWrapper',
    icon: 'fa:redo',
    group: ['transform'],
    version: 1,
    description: 'Retry pattern with circuit breaker for GSD agent/service calls',
    defaults: {
      name: 'GSD Retry Wrapper',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Service URL',
        name: 'serviceUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL of the agent/service to call',
      },
      {
        displayName: 'Request Body',
        name: 'requestBody',
        type: 'json',
        default: '{}',
        description: 'JSON payload to send to the service',
      },
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for audit logging',
      },
      {
        displayName: 'HTTP Method',
        name: 'httpMethod',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
        ],
        default: 'POST',
        description: 'HTTP method to use for the service call',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        description: 'Maximum number of retry attempts before circuit breaks',
      },
      {
        displayName: 'Initial Backoff (ms)',
        name: 'initialBackoffMs',
        type: 'number',
        default: 1000,
        description: 'Initial backoff delay in milliseconds (doubles each retry)',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const serviceUrl = this.getNodeParameter('serviceUrl', i) as string
      const requestBodyRaw = this.getNodeParameter('requestBody', i) as string
      const buildId = this.getNodeParameter('buildId', i) as string
      const httpMethod = this.getNodeParameter('httpMethod', i) as string
      const maxRetries = this.getNodeParameter('maxRetries', i) as number
      const initialBackoffMs = this.getNodeParameter('initialBackoffMs', i) as number

      const requestBody =
        typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw

      const errors: Array<{ attempt: number; message: string; timestamp: string }> = []
      let succeeded = false
      let responseData: unknown = null

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const requestOptions: Record<string, unknown> = {
            method: httpMethod,
            uri: serviceUrl,
            json: true,
          }

          if (httpMethod !== 'GET') {
            requestOptions.body = requestBody
          }

          responseData = await this.helpers.request(requestOptions)
          succeeded = true
          break
        } catch (error: unknown) {
          const errorEntry = {
            attempt: attempt + 1,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }
          errors.push(errorEntry)

          await logRetryError(this.helpers, buildId, serviceUrl, errorEntry)

          if (attempt < maxRetries - 1) {
            const backoff = initialBackoffMs * Math.pow(2, attempt)
            await new Promise((resolve) => setTimeout(resolve, backoff))
          }
        }
      }

      if (succeeded) {
        returnData.push({
          json: {
            circuitBroken: false,
            data: responseData as any,
          },
        })
      } else {
        const result = {
          json: {
            circuitBroken: true,
            serviceUrl,
            buildId,
            totalAttempts: maxRetries,
            errors,
          },
        }

        if (this.continueOnFail()) {
          returnData.push(result)
        } else {
          throw new Error(
            `Circuit broken for ${serviceUrl} after ${maxRetries} attempts: ${errors.map((e) => e.message).join('; ')}`,
          )
        }
      }
    }

    return [returnData]
  }
}
