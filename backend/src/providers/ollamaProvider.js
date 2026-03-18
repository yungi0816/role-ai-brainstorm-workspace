import { BaseProvider } from './baseProvider.js';
import {
  generateOllamaText,
  getOllamaHost,
  getOllamaStatus,
  OLLAMA_SMALL_LOCAL_MODELS
} from '../services/ollamaRuntimeService.js';

const OLLAMA_MODEL_OPTIONS = [
  {
    id: 'gemma3:1b',
    label: 'Gemma 3 1B',
    sizeLabel: '약 815 MB',
    locality: 'local'
  },
  {
    id: 'gemma3:4b',
    label: 'Gemma 3 4B',
    sizeLabel: '약 3.3 GB',
    locality: 'local'
  },
  {
    id: 'qwen2.5-coder:1.5b',
    label: 'Qwen2.5 Coder 1.5B',
    sizeLabel: '약 986 MB',
    locality: 'local'
  },
  {
    id: 'llama3.2:1b',
    label: 'Llama 3.2 1B',
    sizeLabel: '약 1.3 GB',
    locality: 'local'
  }
];

export class OllamaProvider extends BaseProvider {
  constructor() {
    super({
      id: 'ollama',
      label: 'Ollama Local',
      status: 'runtime_managed',
      models: OLLAMA_SMALL_LOCAL_MODELS,
      modelOptions: OLLAMA_MODEL_OPTIONS,
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

  assertUsable({ model } = {}) {
    this.validateModel(model);
  }

  async generateText({ model, prompt, options }) {
    this.validateModel(model);
    return generateOllamaText({ model, prompt, options });
  }
}
