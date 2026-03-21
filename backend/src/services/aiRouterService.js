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
