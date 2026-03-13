import { useEffect, useMemo, useState } from 'react';
import ChatPanel from './components/ChatPanel.jsx';
import MindMapPanel from './components/MindMapPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { fetchProviders, sendChatMessage, sendNodeQuestion } from './api/chatApi.js';
import {
  createErrorMessage,
  createUserMessage,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  initialConversationState,
  toAssistantMessage
} from './stores/conversationStore.js';

function ChatRevealTab({ onClick }) {
  return (
    <button
      type="button"
      className="window-no-drag fixed right-0 top-24 z-[90] flex h-20 w-8 items-center justify-center rounded-l-md border border-r-0 border-cyan-300/20 bg-slate-950/88 text-cyan-100 shadow-xl shadow-cyan-950/30 backdrop-blur transition hover:bg-slate-900"
      onClick={onClick}
      title="Show chat"
      aria-label="Show chat"
    >
      &gt;
    </button>
  );
}

function ChatTuckButton({ onClick }) {
  return (
    <button
      type="button"
      className="window-no-drag absolute -left-8 top-20 z-[91] flex h-16 w-8 items-center justify-center rounded-l-md border border-r-0 border-cyan-300/20 bg-slate-950/88 text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:bg-slate-900"
      onClick={onClick}
      title="Hide chat"
      aria-label="Hide chat"
    >
      &gt;
    </button>
  );
}

export default function App() {
  const [providers, setProviders] = useState([]);
  const [state, setState] = useState(initialConversationState);
  const [input, setInput] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);

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

  function setMindmapExpanded(expanded) {
    setIsMindmapOpen(expanded);
    window.desktopWindow?.setMindmapExpanded(expanded);

    if (!expanded) {
      setIsChatVisible(true);
      setState((current) => ({ ...current, selectedNode: null }));
    }
  }

  function toggleMindmap() {
    setMindmapExpanded(!isMindmapOpen);
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
    setIsChatVisible(true);
  }

  async function handleNodeQuestion(question) {
    const content = String(question || '').trim();
    if (!content || state.isSending || !state.conversationId || !state.selectedNode) {
      return;
    }

    setIsChatVisible(true);
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
    <div className="relative h-screen min-h-0 overflow-hidden bg-[#07111f] text-slate-100">
      <div className="workspace-stage absolute inset-0" />

      {isMindmapOpen ? (
        <div className="absolute inset-3 z-10">
          <MindMapPanel
            mindmap={state.mindmap}
            selectedNode={state.selectedNode}
            onSelectNode={(node) => setState((current) => ({ ...current, selectedNode: node }))}
            onAskNodeQuestion={handleNodeQuestion}
            isSending={state.isSending}
          />
        </div>
      ) : null}

      {isChatVisible ? (
        <div
          className={[
            'window-no-drag fixed z-[80]',
            isMindmapOpen
              ? 'right-3 top-3 h-[min(700px,calc(100vh-24px))] w-[430px]'
              : 'inset-0'
          ].join(' ')}
        >
          {isMindmapOpen ? (
            <ChatTuckButton onClick={() => setIsChatVisible(false)} />
          ) : null}
          <ChatPanel
            messages={state.messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isSending={state.isSending}
            agentOpinions={state.agentOpinions}
            suggestedQuestions={state.suggestedQuestions}
            onSuggestedQuestion={handleSuggestedQuestion}
            onToggleMindmap={toggleMindmap}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onMinimizeWindow={() => window.desktopWindow?.minimize()}
            onCloseWindow={() => window.desktopWindow?.close()}
            isMindmapOpen={isMindmapOpen}
            providerLabel={activeProvider?.label || state.provider}
            model={state.model}
          />
        </div>
      ) : (
        <ChatRevealTab onClick={() => setIsChatVisible(true)} />
      )}

      {state.error ? (
        <div className="window-no-drag fixed bottom-4 left-1/2 z-[95] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-md border border-rose-300/30 bg-rose-950/88 px-4 py-2 text-sm text-rose-100 shadow-lg">
          {state.error}
        </div>
      ) : null}

      <SettingsPanel
        isOpen={isSettingsOpen}
        providers={providers}
        provider={state.provider}
        model={state.model}
        onProviderChange={updateProvider}
        onModelChange={(model) => setState((current) => ({ ...current, model }))}
        onRefresh={loadProviders}
        isRefreshing={isRefreshingProviders}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
