import { BaseProvider, summarizeChecks } from './baseProvider.js';
import {
  generateOllamaText,
  getOllamaHost,
  getOllamaStatus,
  listOllamaModels,
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

  async diagnose({ model } = {}) {
    const runtime = await listOllamaModels();
    const status = runtime.status;
    const installedModels = new Set((runtime.models || []).map((item) => item.name));
    const checks = [
      {
        id: 'ollama-installed',
        label: 'Ollama install',
        status: status.installed ? 'pass' : 'fail',
        message: status.installed ? 'Ollama CLI is installed.' : 'Install Ollama before using local models.'
      },
      {
        id: 'ollama-server',
        label: 'Ollama server',
        status: status.serverRunning ? 'pass' : 'warn',
        message: status.serverRunning ? 'Ollama server process is running.' : 'Start Ollama or run "ollama serve".'
      },
      {
        id: 'ollama-connection',
        label: 'localhost:11434 connection',
        status: status.connected ? 'pass' : 'fail',
        message: status.connected ? `Connected to ${status.host}.` : `Cannot connect to ${status.host}.`
      }
    ];

    if (model) {
      checks.push({
        id: 'ollama-model',
        label: 'Selected model',
        status: installedModels.has(model) ? 'pass' : 'warn',
        message: installedModels.has(model)
          ? `Model "${model}" is installed.`
          : `Model "${model}" is missing. Pull it before testing or chatting.`
      });
    }

    return {
      provider: this.getMetadata(),
      model,
      checkedAt: new Date().toISOString(),
      summary: summarizeChecks(checks),
      checks,
      runtime
    };
  }

  assertUsable({ model } = {}) {
    this.validateModel(model);
  }

  async generateText({ model, prompt, options }) {
    this.validateModel(model);
    return generateOllamaText({ model, prompt, options });
  }
}
