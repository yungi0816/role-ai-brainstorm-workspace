import { useEffect, useMemo, useState } from 'react';
import ChatPanel from './components/ChatPanel.jsx';
import MindMapPanel from './components/MindMapPanel.jsx';
import ProviderSelector from './components/ProviderSelector.jsx';
import { fetchProviders, sendChatMessage, sendNodeQuestion } from './api/chatApi.js';
import {
  createErrorMessage,
  createUserMessage,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  initialConversationState,
  toAssistantMessage
} from './stores/conversationStore.js';

export default function App() {
  const [providers, setProviders] = useState([]);
  const [state, setState] = useState(initialConversationState);
  const [input, setInput] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === state.provider),
    [providers, state.provider]
  );

  async function loadProviders() {
    setIsRefreshingProviders(true);
    try {
      const providerList = await fetchProviders();
      setProviders(providerList);

      setState((current) => {
        const nextProvider = providerList.find((provider) => provider.id === current.provider)
          || providerList.find((provider) => provider.id === DEFAULT_PROVIDER)
          || providerList[0];
        const nextModel = nextProvider?.models?.includes(current.model)
          ? current.model
          : nextProvider?.models?.[0] || DEFAULT_MODEL;

        return {
          ...current,
          provider: nextProvider?.id || DEFAULT_PROVIDER,
          model: nextModel
        };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
    } finally {
      setIsRefreshingProviders(false);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  function updateProvider(providerId) {
    const nextProvider = providers.find((provider) => provider.id === providerId);
    setState((current) => ({
      ...current,
      provider: providerId,
      model: nextProvider?.models?.[0] || current.model
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || state.isSending) {
      return;
    }

    const userMessage = createUserMessage(content);
    setInput('');
    setState((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
      isSending: true,
      error: null
    }));

    try {
      const response = await sendChatMessage({
        conversationId: state.conversationId,
        provider: state.provider,
        model: state.model,
        message: content
      });
      const assistantMessage = toAssistantMessage(response);

      setState((current) => ({
        ...current,
        conversationId: response.conversation?.id || current.conversationId,
        messages: [...current.messages, assistantMessage],
        agentOpinions: response.agentOpinions || [],
        mindmap: response.mindmap || current.mindmap,
        suggestedQuestions: response.suggestedQuestions || [],
        isSending: false
      }));
    } catch (error) {
      const errorPayload = error.response?.data;
      const errorText = errorPayload?.error?.message || error.message;
      const errorMessage = createErrorMessage(errorText);

      setState((current) => ({
        ...current,
        conversationId: errorPayload?.conversation?.id || current.conversationId,
        messages: [...current.messages, errorMessage],
        agentOpinions: errorPayload?.agentOpinions || [],
        mindmap: errorPayload?.mindmap || current.mindmap,
        suggestedQuestions: errorPayload?.suggestedQuestions || [],
        error: errorText,
        isSending: false
      }));
    }
  }

  function handleSuggestedQuestion(question) {
    setInput(question);
  }

  async function handleNodeQuestion(question) {
    const content = String(question || '').trim();
    if (!content || state.isSending || !state.conversationId || !state.selectedNode) {
      return;
    }

    const nodeLabel = state.selectedNode.label || 'selected node';
    const userMessage = createUserMessage(`[${nodeLabel}] ${content}`);
    setState((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
      isSending: true,
      error: null
    }));

    try {
      const response = await sendNodeQuestion({
        conversationId: state.conversationId,
        nodeId: state.selectedNode.id,
        question: content
      });
      const assistantMessage = toAssistantMessage(response);

      setState((current) => {
        const nextMindmap = response.mindmap || current.mindmap;
        const nextSelectedNode = nextMindmap.nodes?.find((node) => node.id === current.selectedNode?.id) || null;

        return {
          ...current,
          messages: [...current.messages, assistantMessage],
          agentOpinions: response.agentOpinions || [],
          mindmap: nextMindmap,
          suggestedQuestions: response.suggestedQuestions || [],
          selectedNode: nextSelectedNode,
          isSending: false
        };
      });
    } catch (error) {
      const errorPayload = error.response?.data;
      const errorText = errorPayload?.error?.message || error.message;
      const errorMessage = createErrorMessage(errorText);

      setState((current) => ({
        ...current,
        messages: [...current.messages, errorMessage],
        agentOpinions: errorPayload?.agentOpinions || [],
        mindmap: errorPayload?.mindmap || current.mindmap,
        suggestedQuestions: errorPayload?.suggestedQuestions || [],
        error: errorText,
        isSending: false
      }));
    }
  }

  return (
    <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-slate-100">
      <ProviderSelector
        providers={providers}
        provider={state.provider}
        model={state.model}
        onProviderChange={updateProvider}
        onModelChange={(model) => setState((current) => ({ ...current, model }))}
        onRefresh={loadProviders}
        isRefreshing={isRefreshingProviders}
      />

      {state.error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-sm text-rose-800">
          {state.error}
        </div>
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ChatPanel
          messages={state.messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isSending={state.isSending}
          agentOpinions={state.agentOpinions}
          suggestedQuestions={state.suggestedQuestions}
          onSuggestedQuestion={handleSuggestedQuestion}
        />
        <MindMapPanel
          mindmap={state.mindmap}
          selectedNode={state.selectedNode}
          onSelectNode={(node) => setState((current) => ({ ...current, selectedNode: node }))}
          onAskNodeQuestion={handleNodeQuestion}
          isSending={state.isSending}
        />
      </main>

      <div className="border-t border-slate-200 bg-white px-5 py-2 text-xs text-slate-500">
        {activeProvider?.label || state.provider} / {state.model}
      </div>
    </div>
  );
}
