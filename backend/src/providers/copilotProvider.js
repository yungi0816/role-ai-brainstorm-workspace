import { BaseProvider, summarizeChecks } from './baseProvider.js';

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

  async diagnose({ model } = {}) {
    const checks = [
      {
        id: 'copilot-interface',
        label: 'Provider interface',
        status: 'pass',
        message: 'Copilot provider contract is available.'
      },
      {
        id: 'copilot-sdk',
        label: 'OAuth/SDK execution',
        status: 'warn',
        message: 'Copilot execution is still a stub until OAuth and SDK integration are selected.'
      }
    ];

    if (model) {
      checks.push({
        id: 'copilot-model',
        label: 'Selected model',
        status: this.supportsModel(model) ? 'pass' : 'fail',
        message: this.supportsModel(model) ? `Model "${model}" is accepted.` : `Model "${model}" is not supported.`
      });
    }

    return {
      provider: this.getMetadata(),
      model,
      checkedAt: new Date().toISOString(),
      summary: summarizeChecks(checks),
      checks
    };
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
