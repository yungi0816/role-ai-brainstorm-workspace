import { BaseProvider } from './baseProvider.js';

export class CopilotProvider extends BaseProvider {
  constructor() {
    super({
      id: 'copilot',
      label: 'GitHub Copilot Provider',
      status: 'stub',
      models: ['copilot-chat'],
      capabilities: ['future-oauth', 'future-sdk', 'json-response']
    });
  }

  isConfigured() {
    return false;
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      note: 'Stub only. OAuth/SDK integration can be added later without changing the frontend provider contract.'
    };
  }
}
