import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Minus, Settings, X } from 'lucide-react';
import ChatPanel from './components/ChatPanel.jsx';
import MindMapPanel from './components/MindMapPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import {
  authenticateProvider,
  deleteConversation,
  exportConversation,
  fetchConversation,
  fetchConversations,
  fetchProviderModels,
  fetchProviders,
  sendChatMessage,
  sendNodeQuestion,
  updateMindmapNode
} from './api/chatApi.js';
import {
  createErrorMessage,
  createUserMessage,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  initialConversationState,
  toAssistantMessage,
  toConversationMessages
} from './stores/conversationStore.js';

function WindowControls() {
  return (
    <div className="window-no-drag fixed right-3 top-2 z-[120] flex items-center gap-1">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900/92 text-slate-300 shadow-lg shadow-cyan-950/20 transition hover:border-cyan-300/40 hover:bg-slate-800"
        onClick={() => window.desktopWindow?.minimize()}
        title="Minimize"
        aria-label="Minimize"
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/20 bg-slate-900/92 text-slate-300 shadow-lg shadow-rose-950/20 transition hover:border-rose-300/50 hover:bg-rose-950/70 hover:text-rose-100"
        onClick={() => window.desktopWindow?.close()}
        title="Close"
        aria-label="Close"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function HiddenChatLauncher({ onShowChat, onOpenSettings }) {
  return (
    <div className="window-no-drag fixed right-3 top-14 z-[90] flex flex-col gap-2 rounded-lg border border-cyan-300/15 bg-slate-950/78 p-2 shadow-xl shadow-cyan-950/30 backdrop-blur">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-cyan-100 transition hover:bg-cyan-300/10"
        onClick={onShowChat}
        title="Show chat"
        aria-label="Show chat"
      >
        <MessageCircle size={19} />
      </button>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-700/50"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}

function getProviderModelIds(provider) {
  if (!provider) {
    return [];
  }

  if (provider.modelOptions?.length) {
    return provider.modelOptions.map((item) => item.id);
  }

  return provider.models || [];
}

function getSendBlockedReason(provider) {
  if (!provider) {
    return 'Provider 정보를 불러오는 중입니다.';
  }

  if (provider.id === 'ollama') {
    return null;
  }

  if (provider.status === 'planned') {
    return `${provider.label}는 아직 OAuth/SDK 연동 예정 상태입니다. 다른 provider를 선택하세요.`;
  }

  if (!provider.configured || provider.status === 'needs_auth') {
    return `${provider.label} 인증이 필요합니다. 설정에서 먼저 연결하세요.`;
  }

  if (!provider.ready) {
    return `${provider.label} 준비 상태가 아닙니다. 설정에서 상태를 확인하세요.`;
  }

  return null;
}

export default function App() {
  const [providers, setProviders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [state, setState] = useState(initialConversationState);
  const [input, setInput] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === state.provider),
    [providers, state.provider]
  );
  const sendBlockedReason = getSendBlockedReason(activeProvider);
  const canSend = !sendBlockedReason;

  async function loadProviders() {
    setIsRefreshingProviders(true);
    try {
      const providerList = await fetchProviders();
      setProviders(providerList);

      setState((current) => {
        const nextProvider = providerList.find((provider) => provider.id === current.provider)
          || providerList.find((provider) => provider.id === DEFAULT_PROVIDER)
          || providerList[0];
        const modelIds = getProviderModelIds(nextProvider);
        const nextModel = modelIds.includes(current.model)
          ? current.model
          : modelIds[0] || DEFAULT_MODEL;

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

  async function loadConversations() {
    try {
      const list = await fetchConversations();
      setConversations(list);

      // 현재 선택된 대화가 목록에 없으면 New Chat으로 리셋 (삭제 후 잔상 방지)
      setState((current) => {
        if (current.conversationId && !list.some((c) => c.id === current.conversationId)) {
          return {
            ...current,
            conversationId: null,
            messages: [],
            agentOpinions: [],
            mindmap: { nodes: [], edges: [] },
            suggestedQuestions: [],
            selectedNode: null
          };
        }
        return current;
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
    }
  }

  async function handleDeleteConversation() {
    if (!state.conversationId || state.isSending) {
      return;
    }

    if (!window.confirm('정말 이 대화방을 삭제하시겠습니까? 삭제된 대화와 마인드맵 데이터는 복구할 수 없습니다.')) {
      return;
    }

    setState((current) => ({ ...current, isSending: true, error: null }));

    try {
      await deleteConversation(state.conversationId);
      await loadConversations();
      handleNewChat();
    } catch (error) {
      setState((current) => ({
        ...current,
        isSending: false,
        error: error.response?.data?.error?.message || error.message
      }));
    }
  }

  function mergeProvider(providerMetadata) {
    setProviders((current) => {
      const exists = current.some((provider) => provider.id === providerMetadata.id);
      if (!exists) {
        return [...current, providerMetadata];
      }

      return current.map((provider) => (
        provider.id === providerMetadata.id ? providerMetadata : provider
      ));
    });
  }

  async function loadProviderModels(providerId) {
    try {
      const result = await fetchProviderModels(providerId);
      mergeProvider({
        ...result.provider,
        modelOptions: result.modelOptions || result.models || [],
        models: (result.modelOptions || result.models || []).map((item) => item.id || item)
      });

      setState((current) => {
        if (current.provider !== providerId) {
          return current;
        }

        const modelIds = (result.modelOptions || result.models || []).map((item) => item.id || item);
        return {
          ...current,
          model: modelIds.includes(current.model) ? current.model : modelIds[0] || current.model
        };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
    }
  }

  useEffect(() => {
    loadProviders();
    loadConversations();
  }, []);

  function updateProvider(providerId) {
    const nextProvider = providers.find((provider) => provider.id === providerId);
    const modelIds = getProviderModelIds(nextProvider);
    setState((current) => ({
      ...current,
      provider: providerId,
      model: modelIds[0] || current.model
    }));
    loadProviderModels(providerId);
  }

  async function handleProviderAuth(providerId, payload) {
    setIsAuthenticating(true);
    setState((current) => ({ ...current, error: null }));

    try {
      const result = await authenticateProvider(providerId, payload);
      const authUrl = result.provider?.authUrl || result.authUrl;

      if (authUrl) {
        if (window.desktopShell?.openExternal) {
          await window.desktopShell.openExternal(authUrl);
        } else {
          window.open(authUrl, '_blank');
        }
        return;
      }

      mergeProvider({
        ...result.provider,
        modelOptions: result.modelOptions || result.models || [],
        models: (result.modelOptions || result.models || []).map((item) => item.id || item)
      });
      await loadProviderModels(providerId);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleExportConversation() {
    if (!state.conversationId || state.isSending) {
      return;
    }

    try {
      const result = await exportConversation(state.conversationId, 'markdown');
      const content = typeof result.content === 'string'
        ? result.content
        : JSON.stringify(result.content, null, 2);
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || 'conversation-export.md';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
    }
  }

  function handleNewChat() {
    setInput('');
    setState((current) => ({
      ...initialConversationState,
      provider: current.provider,
      model: current.model,
      isSending: false,
      error: null
    }));
    setIsChatVisible(true);
  }

  async function handleSelectConversation(conversationId) {
    if (!conversationId || conversationId === state.conversationId) {
      return;
    }

    setState((current) => ({ ...current, isSending: true, error: null }));
    setIsChatVisible(true);

    try {
      const snapshot = await fetchConversation(conversationId);
      setState((current) => ({
        ...current,
        conversationId: snapshot.conversation.id,
        provider: snapshot.conversation.provider,
        model: snapshot.conversation.model,
        messages: toConversationMessages(snapshot.messages),
        agentOpinions: [],
        mindmap: snapshot.mindmap || { nodes: [], edges: [] },
        suggestedQuestions: [],
        selectedNode: null,
        error: null,
        isSending: false
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message,
        isSending: false
      }));
    }
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

    if (sendBlockedReason) {
      setState((current) => ({ ...current, error: sendBlockedReason }));
      setIsSettingsOpen(true);
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
        agentOpinions: [],
        mindmap: response.mindmap || current.mindmap,
        suggestedQuestions: response.suggestedQuestions || [],
        isSending: false
      }));
      await loadConversations();
    } catch (error) {
      const errorPayload = error.response?.data;
      const errorText = errorPayload?.error?.message || error.message;
      const errorMessage = createErrorMessage(errorText);

      setState((current) => ({
        ...current,
        conversationId: errorPayload?.conversation?.id || current.conversationId,
        messages: [...current.messages, errorMessage],
        agentOpinions: [],
        mindmap: errorPayload?.mindmap || current.mindmap,
        suggestedQuestions: errorPayload?.suggestedQuestions || [],
        error: errorText,
        isSending: false
      }));
      await loadConversations();
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
          agentOpinions: [],
          mindmap: nextMindmap,
          suggestedQuestions: response.suggestedQuestions || [],
          selectedNode: nextSelectedNode,
          isSending: false
        };
      });
      await loadConversations();
    } catch (error) {
      const errorPayload = error.response?.data;
      const errorText = errorPayload?.error?.message || error.message;
      const errorMessage = createErrorMessage(errorText);

      setState((current) => ({
        ...current,
        messages: [...current.messages, errorMessage],
        agentOpinions: [],
        mindmap: errorPayload?.mindmap || current.mindmap,
        suggestedQuestions: errorPayload?.suggestedQuestions || [],
        error: errorText,
        isSending: false
      }));
      await loadConversations();
    }
  }

  async function handleUpdateMindmapNode(nodeId, payload) {
    if (!state.conversationId || !nodeId || state.isSending) {
      return;
    }

    try {
      const response = await updateMindmapNode(state.conversationId, nodeId, payload);
      setState((current) => ({
        ...current,
        mindmap: response.mindmap || current.mindmap,
        selectedNode: response.node || current.selectedNode,
        error: null
      }));
      await loadConversations();
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.error?.message || error.message
      }));
      return false;
    }
  }

  return (
    <div className="relative h-screen min-h-0 overflow-hidden bg-[#07111f] text-slate-100">
      <div className="workspace-stage absolute inset-0" />
      <WindowControls />

      {isMindmapOpen ? (
        <div
          className={[
            'absolute bottom-3 left-3 top-3 z-10',
            isChatVisible ? 'right-[446px]' : 'right-3'
          ].join(' ')}
        >
          <MindMapPanel
            mindmap={state.mindmap}
            selectedNode={state.selectedNode}
            onSelectNode={(node) => setState((current) => ({ ...current, selectedNode: node }))}
            onAskNodeQuestion={handleNodeQuestion}
            onUpdateNode={handleUpdateMindmapNode}
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
            onHideChat={() => setIsChatVisible(false)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isMindmapOpen={isMindmapOpen}
            providerLabel={activeProvider?.label || state.provider}
            model={state.model}
            conversations={conversations}
            conversationId={state.conversationId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onExportConversation={handleExportConversation}
            canSend={canSend}
            sendBlockedReason={sendBlockedReason}
          />
        </div>
      ) : (
        <HiddenChatLauncher
          onShowChat={() => setIsChatVisible(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
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
        onProviderAuth={handleProviderAuth}
        isAuthenticating={isAuthenticating}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
