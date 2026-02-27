import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class BmadValidator implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'BMAD Validator',
        name: 'bmadValidator',
        icon: 'fa:check-circle',
        group: ['transform'],
        version: 1,
        description: 'Validates PRD completeness via BMAD microservice',
        defaults: {
            name: 'BMAD Validator',
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
                displayName: 'PRD JSON',
                name: 'prdJson',
                type: 'json',
                default: '{}',
                description: 'The PRD JSON object to validate',
            }
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        for (let i = 0; i < items.length; i++) {
            const buildId = this.getNodeParameter('buildId', i) as string;
            const prdJson = this.getNodeParameter('prdJson', i) as string;
            
            try {
                const prd = typeof prdJson === 'string' ? JSON.parse(prdJson) : prdJson;
                const uri = (process.env.BMAD_VALIDATOR_URL || 'http://bmad-validator:3000') + '/validate';
                
                const response = await this.helpers.request({
                    method: 'POST',
                    uri,
                    body: { buildId, prd },
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
