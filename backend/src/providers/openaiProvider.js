import { BaseProvider } from './baseProvider.js';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      id: 'openai',
      label: 'OpenAI GPT',
      status: 'not_implemented',
      models: ['gpt-4.1-mini', 'gpt-4.1'],
      capabilities: ['remote-api', 'json-response']
    });
  }

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      apiKeyRequired: true,
      apiKeyPresent: this.isConfigured()
    };
  }
}
