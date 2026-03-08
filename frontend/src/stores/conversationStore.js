export const DEFAULT_PROVIDER = 'ollama';
export const DEFAULT_MODEL = 'gemma3:1b';

export const initialConversationState = {
  conversationId: null,
  provider: DEFAULT_PROVIDER,
  model: DEFAULT_MODEL,
  messages: [],
  agentOpinions: [],
  mindmap: {
    nodes: [],
    edges: []
  },
  suggestedQuestions: [],
  selectedNode: null,
  error: null,
  isSending: false
};

export function createUserMessage(content) {
  return {
    id: `local-user-${crypto.randomUUID()}`,
    role: 'user',
    content,
    created_at: new Date().toISOString()
  };
}

export function createErrorMessage(content) {
  return {
    id: `local-error-${crypto.randomUUID()}`,
    role: 'assistant',
    content,
    isError: true,
    created_at: new Date().toISOString()
  };
}

export function toAssistantMessage(response) {
  return {
    id: response.message?.id || `local-assistant-${crypto.randomUUID()}`,
    role: 'assistant',
    content: response.chatResponse || response.message?.content || '',
    created_at: response.message?.created_at || new Date().toISOString()
  };
}
