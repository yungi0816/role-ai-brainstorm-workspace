import { BaseProvider } from './baseProvider.js';

export const OLLAMA_SMALL_LOCAL_MODELS = [
  'gemma3:1b',
  'gemma3:4b',
  'qwen2.5-coder:1.5b',
  'llama3.2:1b'
];

export class OllamaProvider extends BaseProvider {
  constructor() {
    super({
      id: 'ollama',
      label: 'Ollama Local',
      status: 'runtime_pending',
      models: OLLAMA_SMALL_LOCAL_MODELS,
      capabilities: ['local-runtime', 'model-discovery', 'json-response']
    });
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      runtime: {
        host: process.env.OLLAMA_HOST || 'http://localhost:11434',
        installCheck: 'planned',
        serverCheck: 'planned',
        connectionCheck: 'planned'
      }
    };
  }
}
