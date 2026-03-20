import { BaseProvider } from './baseProvider.js';

export class CopilotProvider extends BaseProvider {
  constructor() {
    super({
      id: 'copilot',
      label: 'GitHub Copilot Provider',
      status: 'needs_auth',
      models: ['copilot-chat'],
      modelOptions: [
        {
          id: 'copilot-chat',
          label: 'Copilot Chat',
          sizeLabel: 'OAuth 연동 필요',
          locality: 'remote'
        }
      ],
      capabilities: ['oauth', 'sdk', 'json-response'],
      auth: {
        type: 'oauth',
        label: 'GitHub Account',
        helpText: 'GitHub Copilot 기능을 사용하려면 GitHub 계정 로그인이 필요합니다. 아래 버튼을 눌러 인증을 진행하세요.',
        fields: [
          {
            id: 'clientId',
            label: 'GitHub Client ID',
            type: 'text',
            placeholder: 'your-github-client-id',
            required: true
          }
        ]
      }
    });

    this.isAuthorized = false;
  }

  getStatus() {
    return this.isAuthorized ? 'ready' : 'needs_auth';
  }

  isConfigured() {
    return true;
  }

  async configureCredentials(config = {}) {
    const clientId = config.clientId || process.env.GITHUB_CLIENT_ID || 'mock-client-id';

    // GitHub OAuth URL
    const authUrl = 'https://github.com/login/oauth/authorize'
      + `?client_id=${clientId}`
      + '&scope=read:user'
      + '&redirect_uri=http://localhost:4000/api/providers/copilot/callback';

    return {
      ...this.getMetadata(),
      authUrl,
      note: clientId === 'mock-client-id' ? 'Client ID가 설정되지 않았습니다. 설정 패널에서 Client ID를 입력하세요.' : null
    };
  }

  async handleCallback(code) {
    if (code) {
      this.isAuthorized = true;
      return true;
    }
    return false;
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      note: 'Stub only. OAuth/SDK integration can be added later without changing the frontend provider contract.'
    };
  }
}
