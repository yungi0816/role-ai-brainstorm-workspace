import { BaseProvider, ProviderError } from './baseProvider.js';

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_FALLBACK_MODELS = [
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    sizeLabel: 'Cloud / API',
    locality: 'remote'
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    sizeLabel: 'Cloud / API',
    locality: 'remote'
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    sizeLabel: 'Cloud / API',
    locality: 'remote'
  }
];

function getApiKey() {
  return process.env.OPENAI_API_KEY;
}

function isChatModel(modelId) {
  return /^(gpt-|o\d|chatgpt)/i.test(modelId)
    && !/(embedding|transcribe|tts|audio|image|moderation|realtime)/i.test(modelId);
}

async function readOpenAiError(response) {
  const text = await response.text();
  if (!text) {
    return `OpenAI API returned HTTP ${response.status}.`;
  }

  try {
    const payload = JSON.parse(text);
    return payload.error?.message || text;
  } catch {
    return text;
  }
}

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      id: 'openai',
      label: 'OpenAI GPT',
      status: 'needs_auth',
      models: OPENAI_FALLBACK_MODELS.map((model) => model.id),
      modelOptions: OPENAI_FALLBACK_MODELS,
      capabilities: ['remote-api', 'model-discovery', 'json-response'],
      auth: {
        type: 'api_key',
        label: 'OpenAI API Key',
        placeholder: 'sk-...',
        helpText: 'API Key는 백엔드 프로세스 메모리에만 보관되고 프론트에 다시 노출되지 않습니다.'
      }
    });

    this.discoveredModelOptions = [];
  }

  getStatus() {
    return this.isConfigured() ? 'ready' : 'needs_auth';
  }

  isConfigured() {
    return Boolean(getApiKey());
  }

  getModelOptions() {
    return this.discoveredModelOptions.length > 0
      ? this.discoveredModelOptions
      : OPENAI_FALLBACK_MODELS;
  }

  supportsModel(model) {
    return this.getModelOptions().some((item) => item.id === model)
      || OPENAI_FALLBACK_MODELS.some((item) => item.id === model);
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      apiKeyRequired: true,
      apiKeyPresent: this.isConfigured()
    };
  }

  async configureCredentials({ apiKey }) {
    const key = String(apiKey || '').trim();
    if (!key) {
      throw new ProviderError('OpenAI API Key is required.', {
        code: 'OPENAI_API_KEY_REQUIRED',
        statusCode: 400,
        providerId: this.id
      });
    }

    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = key;
    try {
      await this.listModelOptions({ forceRefresh: true });
    } catch (error) {
      process.env.OPENAI_API_KEY = previousKey;
      throw error;
    }

    return this.getMetadata();
  }

  async listModelOptions({ forceRefresh = false } = {}) {
    if (!this.isConfigured()) {
      return this.getModelOptions();
    }

    if (this.discoveredModelOptions.length > 0 && !forceRefresh) {
      return this.discoveredModelOptions;
    }

    const response = await fetch(`${OPENAI_API_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`
      }
    });

    if (!response.ok) {
      throw new ProviderError(`OpenAI authentication failed: ${await readOpenAiError(response)}`, {
        code: 'OPENAI_AUTH_FAILED',
        statusCode: response.status === 401 ? 401 : 502,
        providerId: this.id
      });
    }

    const payload = await response.json();
    const modelOptions = (Array.isArray(payload.data) ? payload.data : [])
      .map((item) => item.id)
      .filter(Boolean)
      .filter(isChatModel)
      .sort()
      .map((id) => ({
        id,
        label: id,
        sizeLabel: 'Cloud / API',
        locality: 'remote'
      }));

    this.discoveredModelOptions = modelOptions.length > 0
      ? modelOptions
      : OPENAI_FALLBACK_MODELS;

    return this.discoveredModelOptions;
  }

  async generateText({ model, prompt }) {
    this.assertUsable({ model });

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        response_format: {
          type: 'json_object'
        }
      })
    });

    if (!response.ok) {
      throw new ProviderError(`OpenAI request failed: ${await readOpenAiError(response)}`, {
        code: 'OPENAI_REQUEST_FAILED',
        statusCode: response.status >= 500 ? 502 : response.status,
        providerId: this.id
      });
    }

    const payload = await response.json();
    return payload.choices?.[0]?.message?.content || '';
  }
}
