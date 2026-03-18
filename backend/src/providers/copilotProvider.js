import { BaseProvider } from './baseProvider.js';

export class CopilotProvider extends BaseProvider {
  constructor() {
    super({
      id: 'copilot',
      label: 'GitHub Copilot Provider',
      status: 'planned',
      models: ['copilot-chat'],
      modelOptions: [
        {
          id: 'copilot-chat',
          label: 'Copilot Chat',
          sizeLabel: 'OAuth/SDK 연동 예정',
          locality: 'remote'
        }
      ],
      capabilities: ['future-oauth', 'future-sdk', 'json-response'],
      auth: {
        type: 'planned_oauth',
        label: 'GitHub OAuth',
        helpText: 'GitHub Copilot OAuth/SDK 연동을 붙일 수 있도록 인터페이스만 준비된 상태입니다.'
      }
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
