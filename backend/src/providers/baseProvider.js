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
  constructor({
    id,
    label,
    status = 'not_implemented',
    models = [],
    modelOptions = null,
    capabilities = [],
    auth = null
  }) {
    if (!id || !label) {
      throw new Error('Provider id and label are required.');
    }

    this.id = id;
    this.label = label;
    this.status = status;
    this.models = models;
    this.modelOptions = modelOptions || models.map((model) => ({ id: model, label: model }));
    this.capabilities = capabilities;
    this.auth = auth;
  }

  getMetadata() {
    const modelOptions = this.getModelOptions();

    return {
      id: this.id,
      label: this.label,
      status: this.getStatus(),
      configured: this.isConfigured(),
      ready: this.isReady(),
      models: modelOptions.map((model) => model.id),
      modelOptions,
      capabilities: this.capabilities,
      auth: this.getAuthMetadata()
    };
  }

  getStatus() {
    return this.status;
  }

  isReady() {
    return this.isConfigured() && this.getStatus() === 'ready';
  }

  isConfigured() {
    return true;
  }

  getModelOptions() {
    return this.modelOptions;
  }

  async listModelOptions() {
    return this.getModelOptions();
  }

  async diagnose({ model } = {}) {
    const configured = this.isConfigured();
    const status = this.getStatus();
    const modelSupported = model ? this.supportsModel(model) : true;
    const checks = [
      {
        id: 'configured',
        label: 'Configuration',
        status: configured ? 'pass' : 'fail',
        message: configured ? 'Provider is configured.' : 'Provider requires configuration.'
      },
      {
        id: 'status',
        label: 'Readiness',
        status: status === 'ready' ? 'pass' : 'warn',
        message: `Provider status is ${status}.`
      }
    ];

    if (model) {
      checks.push({
        id: 'model',
        label: 'Selected model',
        status: modelSupported ? 'pass' : 'fail',
        message: modelSupported ? `Model "${model}" is supported.` : `Model "${model}" is not supported.`
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

  getAuthMetadata() {
    return this.auth;
  }

  supportsModel(model) {
    const modelIds = this.getModelOptions().map((item) => item.id);
    return modelIds.length === 0 || modelIds.includes(model);
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

    if (this.getStatus() === 'planned') {
      throw new ProviderError(`Provider "${this.id}" is planned but not available yet. Use another provider until OAuth/SDK integration is implemented.`, {
        code: 'PROVIDER_PLANNED_ONLY',
        statusCode: 501,
        providerId: this.id,
        details: {
          status: this.getStatus()
        }
      });
    }

    if (!this.isConfigured()) {
      throw new ProviderError(`Provider "${this.id}" requires authentication. Configure it in Settings before sending a message.`, {
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

  async configureCredentials() {
    throw new ProviderError(`Provider "${this.id}" does not support credential configuration in this build.`, {
      code: 'PROVIDER_AUTH_NOT_SUPPORTED',
      statusCode: 501,
      providerId: this.id
    });
  }

  async handleCallback() {
    return false;
  }
}

export function summarizeChecks(checks) {
  if (checks.some((check) => check.status === 'fail')) {
    return {
      state: 'error',
      message: 'Provider has blocking issues.'
    };
  }

  if (checks.some((check) => check.status === 'warn')) {
    return {
      state: 'warning',
      message: 'Provider needs attention before reliable use.'
    };
  }

  return {
    state: 'ready',
    message: 'Provider is ready.'
  };
}
