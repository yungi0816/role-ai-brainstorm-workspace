import { ProviderError } from '../providers/baseProvider.js';
import { CopilotProvider } from '../providers/copilotProvider.js';
import { AntigravityCliProvider } from '../providers/antigravityCliProvider.js';
import { OllamaProvider } from '../providers/ollamaProvider.js';
import { OpenAIProvider } from '../providers/openaiProvider.js';
import {
  buildBrainstormPrompt,
  buildJsonRepairPrompt,
  normalizeAiJsonResponse
} from './promptService.js';
import { recordProviderLog } from './providerDebugLogService.js';

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

async function generateProviderText(provider, { model, prompt, conversation, timeoutMs }) {
  const rawProviderResponse = await provider.generateText({
    model,
    prompt,
    conversation,
    timeoutMs
  });

  return provider.extractText(rawProviderResponse);
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
  recordProviderLog({
    providerId: provider.id,
    event: 'provider.auth.start',
    message: 'Provider authentication/configuration started.'
  });

  try {
    const metadata = await provider.configureCredentials(credentials || {});
    const models = await provider.listModelOptions();

    recordProviderLog({
      providerId: provider.id,
      event: 'provider.auth.success',
      message: 'Provider authentication/configuration completed.',
      details: {
        modelCount: models.length,
        status: metadata.status
      }
    });

    return {
      provider: metadata,
      models,
      modelOptions: models
    };
  } catch (error) {
    recordProviderLog({
      providerId: provider.id,
      event: 'provider.auth.failure',
      level: 'error',
      message: error.message,
      details: error.details || null
    });
    throw error;
  }
}

export async function diagnoseProvider(providerId, { model } = {}) {
  const provider = getProviderOrThrow(providerId);
  recordProviderLog({
    providerId: provider.id,
    model,
    event: 'provider.diagnostics.start',
    message: 'Provider diagnostics started.'
  });

  try {
    const result = await provider.diagnose({ model });
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.diagnostics.complete',
      level: result.summary?.state === 'error' ? 'warn' : 'info',
      message: result.summary?.message || 'Provider diagnostics completed.',
      details: {
        summary: result.summary,
        checks: (result.checks || []).map((check) => ({
          id: check.id,
          status: check.status,
          message: check.message
        }))
      }
    });
    return result;
  } catch (error) {
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.diagnostics.failure',
      level: 'error',
      message: error.message,
      details: error.details || null
    });
    throw error;
  }
}

export async function testProvider(providerId, { model } = {}) {
  const provider = getProviderOrThrow(providerId);
  const selectedModel = model || provider.getModelOptions()[0]?.id;
  const startedAt = Date.now();
  recordProviderLog({
    providerId: provider.id,
    model: selectedModel,
    event: 'provider.test.start',
    message: 'Provider execution test started.'
  });

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

    const result = {
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

    recordProviderLog({
      providerId: provider.id,
      model: selectedModel,
      event: ok ? 'provider.test.success' : 'provider.test.invalid-json',
      level: ok ? 'info' : 'warn',
      message: result.message,
      details: {
        durationMs: result.durationMs,
        rawPreview: result.rawPreview
      }
    });

    return result;
  } catch (error) {
    const result = {
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

    recordProviderLog({
      providerId: provider.id,
      model: selectedModel,
      event: 'provider.test.failure',
      level: 'error',
      message: result.message,
      details: {
        category: result.category,
        durationMs: result.durationMs,
        errorDetails: result.details
      }
    });

    return result;
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
  const startedAt = Date.now();

  recordProviderLog({
    providerId: provider.id,
    model,
    event: 'provider.chat.start',
    message: 'Provider brainstorm generation started.',
    details: {
      conversationId: conversation?.id,
      messageLength: String(message || '').length
    }
  });

  try {
    provider.assertUsable({ model });
  } catch (error) {
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.chat.unusable',
      level: 'error',
      message: error.message,
      details: error.details || null
    });
    throw error;
  }

  const prompt = buildBrainstormPrompt({
    message,
    history,
    mindmap,
    nodeContext
  });

  let rawText;
  try {
    rawText = await generateProviderText(provider, {
      model,
      prompt,
      conversation
    });
  } catch (error) {
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.chat.failure',
      level: 'error',
      message: error.message,
      details: {
        durationMs: Date.now() - startedAt,
        errorDetails: error.details || null
      }
    });
    throw error;
  }

  recordProviderLog({
    providerId: provider.id,
    model,
    event: 'provider.chat.raw-response',
    message: 'Provider returned a raw response.',
    details: {
      durationMs: Date.now() - startedAt,
      responseLength: rawText.length,
      rawPreview: compactText(rawText, 500)
    }
  });

  const normalized = normalizeAiJsonResponse(rawText);
  if (normalized.metadata?.normalizedBy !== 'fallback') {
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.chat.normalized',
      message: 'Provider response was normalized successfully.',
      details: {
        durationMs: Date.now() - startedAt,
        normalizedBy: normalized.metadata?.normalizedBy
      }
    });
    return normalized;
  }

  try {
    const repairPrompt = buildJsonRepairPrompt({
      rawText,
      parseError: normalized.metadata?.parseError
    });
    const repairedText = await generateProviderText(provider, {
      model,
      prompt: repairPrompt,
      conversation,
      timeoutMs: 60000
    });
    const repaired = normalizeAiJsonResponse(repairedText);

    if (repaired.metadata?.normalizedBy !== 'fallback') {
      recordProviderLog({
        providerId: provider.id,
        model,
        event: 'provider.chat.repair-success',
        level: 'warn',
        message: 'Provider response needed JSON repair and was recovered.',
        details: {
          durationMs: Date.now() - startedAt,
          initialParseError: normalized.metadata?.parseError
        }
      });
      return {
        ...repaired,
        metadata: {
          ...repaired.metadata,
          repairAttempted: true,
          repairSucceeded: true,
          initialParseError: normalized.metadata?.parseError
        }
      };
    }

    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.chat.fallback',
      level: 'warn',
      message: 'Provider response could not be repaired and fallback normalization was used.',
      details: {
        durationMs: Date.now() - startedAt,
        parseError: normalized.metadata?.parseError,
        repairParseError: repaired.metadata?.parseError
      }
    });
    return {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        repairAttempted: true,
        repairSucceeded: false,
        repairParseError: repaired.metadata?.parseError
      }
    };
  } catch (error) {
    recordProviderLog({
      providerId: provider.id,
      model,
      event: 'provider.chat.repair-failure',
      level: 'warn',
      message: 'Provider response repair failed; fallback normalization was used.',
      details: {
        durationMs: Date.now() - startedAt,
        repairError: error.message
      }
    });
    return {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        repairAttempted: true,
        repairSucceeded: false,
        repairError: error.message
      }
    };
  }
}
