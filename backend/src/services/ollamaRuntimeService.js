import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ProviderError } from '../providers/baseProvider.js';

const execFileAsync = promisify(execFile);

export const OLLAMA_SMALL_LOCAL_MODELS = [
  'gemma3:1b',
  'gemma3:4b',
  'qwen2.5-coder:1.5b',
  'llama3.2:1b'
];

const REQUEST_TIMEOUT_MS = 5000;

export function getOllamaHost() {
  return process.env.OLLAMA_HOST || 'http://localhost:11434';
}

function compactError(error) {
  return {
    message: error.message,
    code: error.code,
    stderr: error.stderr ? String(error.stderr).trim() : undefined
  };
}

async function runCommand(command, args, options = {}) {
  return execFileAsync(command, args, {
    windowsHide: true,
    timeout: options.timeout || REQUEST_TIMEOUT_MS
  });
}

async function findOllamaBinary() {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';

  try {
    const { stdout } = await runCommand(command, ['ollama']);
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || null;
  } catch {
    return null;
  }
}

export async function checkOllamaInstallation() {
  const binary = await findOllamaBinary();

  try {
    const { stdout } = await runCommand('ollama', ['--version']);
    return {
      installed: true,
      binary,
      version: stdout.trim() || null
    };
  } catch (error) {
    return {
      installed: false,
      binary,
      version: null,
      error: compactError(error)
    };
  }
}

export async function checkOllamaServerProcess() {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await runCommand('tasklist.exe', [
        '/FI',
        'IMAGENAME eq ollama.exe',
        '/FO',
        'CSV',
        '/NH'
      ]);

      return {
        running: stdout.toLowerCase().includes('ollama.exe'),
        method: 'tasklist'
      };
    } catch (error) {
      return {
        running: false,
        method: 'tasklist',
        error: compactError(error)
      };
    }
  }

  try {
    const { stdout } = await runCommand('pgrep', ['-fl', 'ollama']);
    return {
      running: Boolean(stdout.trim()),
      method: 'pgrep'
    };
  } catch (error) {
    return {
      running: false,
      method: 'pgrep',
      error: compactError(error)
    };
  }
}

async function fetchOllamaJson(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS);
  const url = new URL(pathname, getOllamaHost());

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new ProviderError(`Ollama returned HTTP ${response.status}.`, {
        code: 'OLLAMA_HTTP_ERROR',
        statusCode: response.status,
        providerId: 'ollama',
        details: data
      });
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkOllamaConnection() {
  try {
    const data = await fetchOllamaJson('/api/version');
    return {
      connected: true,
      host: getOllamaHost(),
      version: data.version || null
    };
  } catch (error) {
    return {
      connected: false,
      host: getOllamaHost(),
      error: compactError(error)
    };
  }
}

export async function getOllamaStatus() {
  const [installation, server, connection] = await Promise.all([
    checkOllamaInstallation(),
    checkOllamaServerProcess(),
    checkOllamaConnection()
  ]);

  return {
    host: getOllamaHost(),
    installed: installation.installed,
    serverRunning: server.running,
    connected: connection.connected,
    ready: connection.connected,
    installation,
    server,
    connection,
    recommendedModels: OLLAMA_SMALL_LOCAL_MODELS
  };
}

function normalizeModel(model) {
  return {
    name: model.name,
    modifiedAt: model.modified_at,
    size: model.size,
    digest: model.digest,
    details: model.details || null,
    recommended: OLLAMA_SMALL_LOCAL_MODELS.includes(model.name)
  };
}

export async function listOllamaModels() {
  const status = await getOllamaStatus();

  if (!status.connected) {
    return {
      status,
      models: [],
      recommendedModels: OLLAMA_SMALL_LOCAL_MODELS,
      missingRecommendedModels: OLLAMA_SMALL_LOCAL_MODELS
    };
  }

  const data = await fetchOllamaJson('/api/tags');
  const models = Array.isArray(data.models) ? data.models.map(normalizeModel) : [];
  const localNames = new Set(models.map((model) => model.name));

  return {
    status,
    models,
    recommendedModels: OLLAMA_SMALL_LOCAL_MODELS,
    missingRecommendedModels: OLLAMA_SMALL_LOCAL_MODELS.filter((model) => !localNames.has(model))
  };
}

export async function pullOllamaModel(model) {
  if (!OLLAMA_SMALL_LOCAL_MODELS.includes(model)) {
    throw new ProviderError(`Model "${model}" is not in the supported small local model list.`, {
      code: 'UNSUPPORTED_OLLAMA_PULL_MODEL',
      statusCode: 400,
      providerId: 'ollama',
      details: {
        supportedModels: OLLAMA_SMALL_LOCAL_MODELS
      }
    });
  }

  const status = await getOllamaStatus();
  if (!status.connected) {
    throw new ProviderError('Ollama server is not connected. Start Ollama before pulling a model.', {
      code: 'OLLAMA_NOT_CONNECTED',
      statusCode: 503,
      providerId: 'ollama',
      details: status
    });
  }

  const result = await fetchOllamaJson('/api/pull', {
    method: 'POST',
    timeout: 300000,
    body: {
      name: model,
      stream: false
    }
  });

  return {
    model,
    result
  };
}

export async function generateOllamaText({ model, prompt, options = {} }) {
  const status = await getOllamaStatus();
  if (!status.connected) {
    throw new ProviderError('Ollama server is not connected.', {
      code: 'OLLAMA_NOT_CONNECTED',
      statusCode: 503,
      providerId: 'ollama',
      details: status
    });
  }

  return fetchOllamaJson('/api/generate', {
    method: 'POST',
    timeout: 180000,
    body: {
      model,
      prompt,
      stream: false,
      options
    }
  });
}
