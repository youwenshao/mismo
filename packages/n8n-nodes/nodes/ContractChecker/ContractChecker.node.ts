import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ContractChecker implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Contract Checker',
        name: 'contractChecker',
        icon: 'fa:shield',
        group: ['transform'],
        version: 1,
        description: 'Performs AST analysis and cross-service contract validation',
        defaults: {
            name: 'Contract Checker',
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
                displayName: 'AST Data',
                name: 'astData',
                type: 'json',
                default: '{}',
                description: 'The parsed AST data and interface states from coding agents',
            }
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        for (let i = 0; i < items.length; i++) {
            const buildId = this.getNodeParameter('buildId', i) as string;
            const astDataJson = this.getNodeParameter('astData', i) as string;
            
            try {
                const astData = typeof astDataJson === 'string' ? JSON.parse(astDataJson) : astDataJson;
                const uri = (process.env.CONTRACT_CHECKER_URL || 'http://contract-checker:3000') + '/check';
                
                const response = await this.helpers.request({
                    method: 'POST',
                    uri,
                    body: { buildId, astData },
                    json: true,
                });
                
                returnData.push({
                    json: {
                        success: response.success,
                        data: response,
                    }
                });
            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                } else {
                    throw error;
                }
            }
        }
        
        return [returnData];
    }
}
