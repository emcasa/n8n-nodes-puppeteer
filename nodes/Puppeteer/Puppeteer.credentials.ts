import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class Puppeteer implements ICredentialType {
    name = 'twoCaptchaApi';
    displayName = 'TwoCaptcha API';
    documentationUrl = '';
    properties: INodeProperties[] = [
        {
            displayName: '2Captcha API Key',
            name: 'twoCaptchaApiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
    ];
} 