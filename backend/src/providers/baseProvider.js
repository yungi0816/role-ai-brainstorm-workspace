export const REQUIRED_AGENT_ROLES = [
  '아이디어 뱅크',
  '비판가',
  '검토자',
  '구현 설계자',
  '정리자'
];

export const MINDMAP_NODE_TYPES = [
  'idea',
  'risk',
  'feature',
  'task',
  'decision',
  'question'
];

export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = options.code || 'PROVIDER_ERROR';
    this.statusCode = options.statusCode || 500;
    this.providerId = options.providerId;
    this.details = options.details;
  }
}

export class BaseProvider {
  constructor({ id, label, status = 'not_implemented', models = [], capabilities = [] }) {
    if (!id || !label) {
      throw new Error('Provider id and label are required.');
    }

    this.id = id;
    this.label = label;
    this.status = status;
    this.models = models;
    this.capabilities = capabilities;
  }

  getMetadata() {
    return {
      id: this.id,
      label: this.label,
      status: this.getStatus(),
      configured: this.isConfigured(),
      models: this.models,
      capabilities: this.capabilities
    };
  }

  getStatus() {
    return this.status;
  }

  isConfigured() {
    return true;
  }

  supportsModel(model) {
    return this.models.length === 0 || this.models.includes(model);
  }

  validateModel(model) {
    if (!model) {
      throw new ProviderError('model is required.', {
        code: 'MODEL_REQUIRED',
        statusCode: 400,
        providerId: this.id
      });
    }

    if (!this.supportsModel(model)) {
      throw new ProviderError(`Model "${model}" is not supported by provider "${this.id}".`, {
        code: 'UNSUPPORTED_MODEL',
        statusCode: 400,
        providerId: this.id,
        details: {
          supportedModels: this.models
        }
      });
    }
  }

  assertUsable({ model } = {}) {
    this.validateModel(model);

    if (!this.isConfigured()) {
      throw new ProviderError(`Provider "${this.id}" is not configured.`, {
        code: 'PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
        providerId: this.id
      });
    }

    if (this.getStatus() !== 'ready') {
      throw new ProviderError(`Provider "${this.id}" is not ready yet.`, {
        code: 'PROVIDER_NOT_READY',
        statusCode: 501,
        providerId: this.id,
        details: {
          status: this.getStatus()
        }
      });
    }
  }

  async generateText() {
    throw new ProviderError(`Provider "${this.id}" has not implemented text generation.`, {
      code: 'PROVIDER_TEXT_GENERATION_NOT_IMPLEMENTED',
      statusCode: 501,
      providerId: this.id
    });
  }

  extractText(rawResponse) {
    if (typeof rawResponse === 'string') {
      return rawResponse;
    }

    if (typeof rawResponse?.response === 'string') {
      return rawResponse.response;
    }

    if (typeof rawResponse?.text === 'string') {
      return rawResponse.text;
    }

    return JSON.stringify(rawResponse || {});
  }

  async generateBrainstormResponse() {
    throw new ProviderError(`Provider "${this.id}" has not implemented generation.`, {
      code: 'PROVIDER_GENERATION_NOT_IMPLEMENTED',
      statusCode: 501,
      providerId: this.id
    });
  }
}
