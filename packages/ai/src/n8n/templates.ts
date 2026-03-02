import type { N8nNode, N8nCredential, Integration, TriggerType } from './schema'

let nodeCounter = 0
function nextId(): string {
  return `node_${++nodeCounter}`
}

function pos(index: number): [number, number] {
  return [250 + index * 300, 300]
}

export function resetNodeCounter(): void {
  nodeCounter = 0
}

export function buildTriggerNode(
  type: TriggerType,
  config: Record<string, unknown>,
): { node: N8nNode; credential?: N8nCredential } {
  const id = nextId()

  switch (type) {
    case 'webhook': {
      const path = (config.path as string) || '/webhook'
      const httpMethod = (config.httpMethod as string) || 'POST'
      return {
        node: {
          id,
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: pos(0),
          parameters: { path, httpMethod, responseMode: 'onReceived' },
        },
      }
    }
    case 'schedule': {
      const rule = (config.cronExpression as string) || '0 9 * * *'
      return {
        node: {
          id,
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: pos(0),
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: rule }] },
          },
        },
      }
    }
    case 'manual':
    default:
      return {
        node: {
          id,
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: pos(0),
          parameters: {},
        },
      }
  }
}

export function buildIntegrationNode(
  integration: Integration,
  operation: string,
  parameters: Record<string, unknown>,
  index: number,
): { node: N8nNode; credential: N8nCredential } {
  const id = nextId()
  const position = pos(index + 1)

  switch (integration) {
    case 'slack': {
      const credId = `cred_slack_${id}`
      return {
        node: {
          id,
          name: `Slack: ${operation}`,
          type: 'n8n-nodes-base.slack',
          typeVersion: 2,
          position,
          parameters: {
            resource: 'message',
            operation: operation || 'send',
            channel: parameters.channel || '#general',
            text: parameters.text || '={{$json.message}}',
            ...parameters,
          },
          credentials: { slackApi: { id: credId, name: 'Slack API' } },
        },
        credential: { id: credId, name: 'Slack API', type: 'slackApi' },
      }
    }
    case 'notion': {
      const credId = `cred_notion_${id}`
      return {
        node: {
          id,
          name: `Notion: ${operation}`,
          type: 'n8n-nodes-base.notion',
          typeVersion: 2,
          position,
          parameters: {
            resource: parameters.resource || 'page',
            operation: operation || 'create',
            ...parameters,
          },
          credentials: { notionApi: { id: credId, name: 'Notion API' } },
        },
        credential: { id: credId, name: 'Notion API', type: 'notionApi' },
      }
    }
    case 'google-sheets': {
      const credId = `cred_gsheets_${id}`
      return {
        node: {
          id,
          name: `Google Sheets: ${operation}`,
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position,
          parameters: {
            operation: operation || 'appendOrUpdate',
            documentId: parameters.documentId || '',
            sheetName: parameters.sheetName || 'Sheet1',
            ...parameters,
          },
          credentials: {
            googleSheetsOAuth2Api: { id: credId, name: 'Google Sheets OAuth2' },
          },
        },
        credential: {
          id: credId,
          name: 'Google Sheets OAuth2',
          type: 'googleSheetsOAuth2Api',
        },
      }
    }
    case 'email': {
      const credId = `cred_email_${id}`
      return {
        node: {
          id,
          name: `Email: ${operation}`,
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position,
          parameters: {
            fromEmail: parameters.fromEmail || '',
            toEmail: parameters.toEmail || '={{$json.email}}',
            subject: parameters.subject || '={{$json.subject}}',
            text: parameters.text || '={{$json.body}}',
            ...parameters,
          },
          credentials: { smtp: { id: credId, name: 'SMTP' } },
        },
        credential: { id: credId, name: 'SMTP', type: 'smtp' },
      }
    }
    case 'custom-api':
    default: {
      const credId = `cred_http_${id}`
      return {
        node: {
          id,
          name: `HTTP Request: ${operation}`,
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position,
          parameters: {
            method: parameters.method || 'POST',
            url: parameters.url || '',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Authorization',
                  value: '=Bearer {{$credentials.httpHeaderAuth.value}}',
                },
              ],
            },
            ...parameters,
          },
          credentials: {
            httpHeaderAuth: { id: credId, name: 'HTTP Header Auth' },
          },
        },
        credential: { id: credId, name: 'HTTP Header Auth', type: 'httpHeaderAuth' },
      }
    }
  }
}

export function buildErrorTriggerNode(
  monitoringWebhook: string,
  nodeCount: number,
): N8nNode[] {
  const errorTriggerId = nextId()
  const alertNodeId = nextId()

  return [
    {
      id: errorTriggerId,
      name: 'On Workflow Error',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [250, 600],
      parameters: {},
    },
    {
      id: alertNodeId,
      name: 'Alert: Workflow Failed',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [550, 600],
      parameters: {
        method: 'POST',
        url: monitoringWebhook,
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: 'event', value: 'workflow_error' },
            { name: 'workflow', value: '={{$workflow.name}}' },
            { name: 'error', value: '={{$json.execution.error.message}}' },
            { name: 'timestamp', value: '={{$now.toISO()}}' },
          ],
        },
      },
    },
  ]
}

export function buildMockDataNode(
  actions: Array<{ integration: string; operation: string }>,
): N8nNode {
  const mockPayload: Record<string, unknown> = {
    message: 'Test automation message from Mismo sandbox',
    email: 'test@example.com',
    subject: 'Sandbox Test Run',
    body: 'This is a mock execution from the Mismo testing sandbox.',
    channel: '#test',
    timestamp: new Date().toISOString(),
  }

  for (const action of actions) {
    if (action.integration === 'google-sheets') {
      mockPayload.row = { col1: 'value1', col2: 'value2', col3: 'value3' }
    }
    if (action.integration === 'notion') {
      mockPayload.title = 'Test Page'
      mockPayload.content = 'Created by Mismo sandbox.'
    }
  }

  return {
    id: nextId(),
    name: 'Mock Data',
    type: 'n8n-nodes-base.set',
    typeVersion: 3,
    position: pos(0),
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: Object.entries(mockPayload).map(([name, value]) => ({
          id: name,
          name,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          type: 'string',
        })),
      },
    },
  }
}
