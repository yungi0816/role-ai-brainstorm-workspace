import { BaseProvider } from './baseProvider.js';
import {
  generateOllamaText,
  getOllamaHost,
  getOllamaStatus,
  OLLAMA_SMALL_LOCAL_MODELS
} from '../services/ollamaRuntimeService.js';

export class OllamaProvider extends BaseProvider {
  constructor() {
    super({
      id: 'ollama',
      label: 'Ollama Local',
      status: 'runtime_managed',
      models: OLLAMA_SMALL_LOCAL_MODELS,
      capabilities: ['local-runtime', 'model-discovery', 'json-response']
    });
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      runtime: {
        host: getOllamaHost(),
        installCheck: 'implemented',
        serverCheck: 'implemented',
        connectionCheck: 'implemented'
      }
    };
  }

  async getRuntimeStatus() {
    return getOllamaStatus();
  }

  async generateText({ model, prompt, options }) {
    this.validateModel(model);
    return generateOllamaText({ model, prompt, options });
  }
}
