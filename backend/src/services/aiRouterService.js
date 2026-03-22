import { ProviderError } from '../providers/baseProvider.js';
import { CopilotProvider } from '../providers/copilotProvider.js';
import { AntigravityCliProvider } from '../providers/antigravityCliProvider.js';
import { OllamaProvider } from '../providers/ollamaProvider.js';
import { OpenAIProvider } from '../providers/openaiProvider.js';
import {
  buildBrainstormPrompt,
  normalizeAiJsonResponse
} from './promptService.js';

const providerInstances = [
  new OllamaProvider(),
  new AntigravityCliProvider(),
  new OpenAIProvider(),
  new CopilotProvider()
];

const providerRegistry = new Map();
for (const provider of providerInstances) {
  providerRegistry.set(provider.id, provider);
  for (const alias of provider.aliases || []) {
    providerRegistry.set(alias, provider);
  }
}

const PROVIDER_TEST_PROMPT = [
  'Return exactly this JSON object and nothing else:',
  '{"ok":true,"providerReady":true}'
].join('\n');

function compactText(value, maxLength = 1200) {
  return String(value || '').trim().slice(0, maxLength);
}

function parseTestJson(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function classifyProviderError(error) {
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '');
  const text = `${code} ${message}`.toLowerCase();

  if (error.details?.status === 'needs_auth') {
    return 'authentication';
  }

  if (text.includes('timeout') || code.includes('TIMEOUT')) {
    return 'timeout';
  }

  if (text.includes('auth') || text.includes('login') || text.includes('401') || text.includes('api key')) {
    return 'authentication';
  }

  if (text.includes('permission') || text.includes('quota') || text.includes('capacity') || text.includes('403')) {
    return 'permission';
  }

  if (text.includes('not found') || text.includes('not_installed') || text.includes('could not be started')) {
    return 'not_installed';
  }

  return 'execution';
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderError('Provider test timed out.', {
        code: 'PROVIDER_TEST_TIMEOUT',
        statusCode: 504
      }));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function listProviders() {
  return providerInstances.map((provider) => provider.getMetadata());
}

export function getProvider(providerId) {
  return providerRegistry.get(providerId);
}

export function getProviderOrThrow(providerId) {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new ProviderError(`Provider "${providerId}" is not registered.`, {
      code: 'UNKNOWN_PROVIDER',
      statusCode: 400,
      providerId
    });
  }

  return provider;
}

export function validateProviderRequest({ provider: providerId, model }) {
  const provider = getProviderOrThrow(providerId);
  provider.validateModel(model);
  return provider.getMetadata();
}

export async function listProviderModels(providerId) {
  const provider = getProviderOrThrow(providerId);
  const models = await provider.listModelOptions();

  return {
    provider: provider.getMetadata(),
    models,
    modelOptions: models
  };
}

export async function configureProvider(providerId, credentials) {
  const provider = getProviderOrThrow(providerId);
  const metadata = await provider.configureCredentials(credentials || {});
  const models = await provider.listModelOptions();

  return {
    provider: metadata,
    models,
    modelOptions: models
  };
}

export async function diagnoseProvider(providerId, { model } = {}) {
  const provider = getProviderOrThrow(providerId);
  return provider.diagnose({ model });
}

export async function testProvider(providerId, { model } = {}) {
  const provider = getProviderOrThrow(providerId);
  const selectedModel = model || provider.getModelOptions()[0]?.id;
  const startedAt = Date.now();

  try {
    provider.assertUsable({ model: selectedModel });
    const rawProviderResponse = await withTimeout(
      provider.generateText({
        model: selectedModel,
        prompt: PROVIDER_TEST_PROMPT,
        timeoutMs: 45000,
        options: {
          temperature: 0
        }
      }),
      45000
    );
    const rawText = provider.extractText(rawProviderResponse);
    const parsed = parseTestJson(rawText);
    const ok = Boolean(parsed?.ok);

    return {
      provider: provider.getMetadata(),
      model: selectedModel,
      testedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      ok,
      status: ok ? 'passed' : 'failed',
      category: ok ? 'ready' : 'json_response',
      message: ok ? 'Provider returned a valid test JSON response.' : 'Provider responded, but did not return the expected JSON.',
      parsed,
      rawPreview: compactText(rawText)
    };
  } catch (error) {
    return {
      provider: provider.getMetadata(),
      model: selectedModel,
      testedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      ok: false,
      status: 'failed',
      category: classifyProviderError(error),
      message: error.message,
      details: error.details || null
    };
  }
}

export async function generateBrainstormResponse({
  provider: providerId,
  model,
  message,
  conversation,
  history = [],
  mindmap = { nodes: [], edges: [] },
  nodeContext = null
}) {
  const provider = getProviderOrThrow(providerId);
  provider.assertUsable({ model });

  const prompt = buildBrainstormPrompt({
    message,
    history,
    mindmap,
    nodeContext
  });

  const rawProviderResponse = await provider.generateText({
    model,
    prompt,
    conversation
  });

  const rawText = provider.extractText(rawProviderResponse);
  return normalizeAiJsonResponse(rawText);
}
