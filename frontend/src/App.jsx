import { useEffect, useMemo, useState } from 'react';
import { Globe2, MessageCircle, Minus, Settings, X } from 'lucide-react';
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

function WindowControls() {
  return (
    <div className="window-no-drag fixed right-4 top-3 z-[90] flex items-center gap-2">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-300/20 bg-slate-950/72 text-slate-300 shadow-lg shadow-cyan-950/30 backdrop-blur transition hover:border-cyan-300/50 hover:bg-slate-900"
        onClick={() => window.desktopWindow?.minimize()}
        title="Minimize"
        aria-label="Minimize"
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/20 bg-slate-950/72 text-slate-300 shadow-lg shadow-rose-950/20 backdrop-blur transition hover:border-rose-300/50 hover:bg-rose-950/70 hover:text-rose-100"
        onClick={() => window.desktopWindow?.close()}
        title="Close"
        aria-label="Close"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function App() {
  const [providers, setProviders] = useState([]);
  const [state, setState] = useState(initialConversationState);
  const [input, setInput] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);

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
    setIsChatOpen(true);
  }

  async function handleNodeQuestion(question) {
    const content = String(question || '').trim();
    if (!content || state.isSending || !state.conversationId || !state.selectedNode) {
      return;
    }

    setIsChatOpen(true);
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
    <div className="relative h-screen min-h-[720px] overflow-hidden bg-[#07111f] text-slate-100">
      <div className="window-drag fixed inset-x-0 top-0 z-[80] h-12" />
      <WindowControls />
      <main className="relative h-full overflow-hidden">
        <div className="workspace-stage absolute inset-0" />
        <div className="window-drag absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 pr-28">
          <div>
            <h1 className="text-lg font-semibold tracking-normal text-slate-50">
              Role AI Brainstorm Workspace
            </h1>
            <div className="mt-1 text-xs text-slate-400">
              {activeProvider?.label || state.provider} / {state.model}
            </div>
          </div>
          <div className="window-no-drag rounded-md border border-cyan-300/15 bg-slate-950/58 px-3 py-2 text-xs text-slate-300 shadow-lg shadow-cyan-950/20 backdrop-blur">
            {state.mindmap.nodes.length} nodes / {state.messages.length} messages
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center px-6">
          <button
            type="button"
            className="window-no-drag group inline-flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/74 text-cyan-200 shadow-[0_24px_80px_rgba(6,182,212,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-slate-900"
            onClick={() => setIsMindmapOpen(true)}
            title="Open mind map"
            aria-label="Open mind map"
          >
            <Globe2 size={48} className="transition group-hover:rotate-12" />
          </button>
        </div>
      </main>

      <div className="window-no-drag fixed left-5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 rounded-lg border border-cyan-300/15 bg-slate-950/68 p-2 shadow-xl shadow-cyan-950/20 backdrop-blur">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cyan-200 transition hover:bg-cyan-300/10"
          onClick={() => setIsMindmapOpen(true)}
          title="Mind map"
          aria-label="Mind map"
        >
          <Globe2 size={20} />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-700/50"
          onClick={() => setIsChatOpen((current) => !current)}
          title="Chat"
          aria-label="Chat"
        >
          <MessageCircle size={20} />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-700/50"
          onClick={() => setIsSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {state.error ? (
        <div className="window-no-drag fixed bottom-5 left-1/2 z-50 max-w-[calc(100vw-40px)] -translate-x-1/2 rounded-md border border-rose-300/30 bg-rose-950/88 px-4 py-2 text-sm text-rose-100 shadow-lg">
          {state.error}
        </div>
      ) : null}

      {isChatOpen ? (
        <div className="window-no-drag fixed right-5 top-16 z-50 h-[min(700px,calc(100vh-84px))] w-[430px] max-w-[calc(100vw-40px)]">
          <ChatPanel
            messages={state.messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isSending={state.isSending}
            agentOpinions={state.agentOpinions}
            suggestedQuestions={state.suggestedQuestions}
            onSuggestedQuestion={handleSuggestedQuestion}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          className="window-no-drag fixed right-5 top-16 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/76 text-cyan-200 shadow-xl transition hover:bg-slate-900"
          onClick={() => setIsChatOpen(true)}
          title="Open chat"
          aria-label="Open chat"
        >
          <MessageCircle size={20} />
        </button>
      )}

      {isMindmapOpen ? (
        <div className="window-no-drag fixed inset-4 z-40 rounded-lg bg-slate-950/42 backdrop-blur-sm">
          <button
            type="button"
            className="absolute right-4 top-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/15 bg-slate-950/82 text-slate-300 shadow-lg transition hover:bg-slate-900"
            onClick={() => setIsMindmapOpen(false)}
            title="Close mind map"
            aria-label="Close mind map"
          >
            <X size={17} />
          </button>
          <MindMapPanel
            mindmap={state.mindmap}
            selectedNode={state.selectedNode}
            onSelectNode={(node) => setState((current) => ({ ...current, selectedNode: node }))}
            onAskNodeQuestion={handleNodeQuestion}
            isSending={state.isSending}
          />
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
