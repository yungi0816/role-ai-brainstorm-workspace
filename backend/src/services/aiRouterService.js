import { ProviderError } from '../providers/baseProvider.js';
import { CopilotProvider } from '../providers/copilotProvider.js';
import { GeminiCliProvider } from '../providers/geminiCliProvider.js';
import { OllamaProvider } from '../providers/ollamaProvider.js';
import { OpenAIProvider } from '../providers/openaiProvider.js';

const providerInstances = [
  new OllamaProvider(),
  new GeminiCliProvider(),
  new OpenAIProvider(),
  new CopilotProvider()
];

const providerRegistry = new Map(
  providerInstances.map((provider) => [provider.id, provider])
);

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

export async function generateBrainstormResponse({
  provider: providerId,
  model,
  message,
  conversation,
  history = [],
  mindmap = { nodes: [], edges: [] }
}) {
  const provider = getProviderOrThrow(providerId);
  provider.assertUsable({ model });

  return provider.generateBrainstormResponse({
    model,
    message,
    conversation,
    history,
    mindmap
  });
}
