import { Globe2, MessageCircle, Plus, Send, Settings, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AgentOpinionPanel from './AgentOpinionPanel.jsx';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm markdown-body',
          isUser
            ? 'bg-cyan-500/18 text-cyan-50 ring-1 ring-cyan-300/20'
            : message.isError
              ? 'border border-rose-300/30 bg-rose-950/70 text-rose-100'
              : 'border border-slate-700/80 bg-slate-900/86 text-slate-100'
        ].join(' ')}
      >
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="rounded-md border border-cyan-300/20 bg-slate-900/74 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-100">
        <span className="h-2 w-2 rounded-full bg-cyan-300" />
        Preparing response and map update
      </div>
      <div className="progress-track">
        <span />
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  isSending,
  agentOpinions,
  suggestedQuestions,
  onSuggestedQuestion,
  onToggleMindmap,
  onHideChat,
  onOpenSettings,
  isMindmapOpen,
  providerLabel,
  model,
  conversations,
  conversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  canSend,
  sendBlockedReason
}) {
  function handleComposerKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/88 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="window-drag flex items-center justify-between gap-3 border-b border-cyan-300/10 bg-slate-950/92 px-3 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-50">Brainstorm Chat</h1>
          <p className="truncate text-[11px] text-slate-400">
            {isSending ? 'Working...' : `${providerLabel} / ${model}`}
          </p>
        </div>
        <div className="window-no-drag flex shrink-0 items-center gap-1 pr-[76px]">
          {isMindmapOpen ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800"
              onClick={onHideChat}
              title="Hide chat"
              aria-label="Hide chat"
            >
              <MessageCircle size={15} />
            </button>
          ) : null}
          <button
            type="button"
            className={[
              'inline-flex h-8 w-8 items-center justify-center rounded-md border transition',
              isMindmapOpen
                ? 'border-cyan-300/50 bg-cyan-400/16 text-cyan-100'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-300/40 hover:bg-slate-800'
            ].join(' ')}
            onClick={onToggleMindmap}
            title={isMindmapOpen ? 'Close mind map' : 'Open mind map'}
            aria-label={isMindmapOpen ? 'Close mind map' : 'Open mind map'}
          >
            <Globe2 size={16} />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-cyan-300/10 bg-slate-950/78 px-3 py-2">
        <select
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
          value={conversationId || 'new'}
          onChange={(event) => {
            if (event.target.value === 'new') {
              onNewChat();
              return;
            }

            onSelectConversation(event.target.value);
          }}
          title="Conversation history"
          aria-label="Conversation history"
        >
          <option value="new">New chat</option>
          {(conversations || []).map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              {conversation.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/18"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
        >
          <Plus size={16} />
        </button>
        {conversationId && conversationId !== 'new' && (
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-300/20 bg-rose-950/30 text-rose-300 transition hover:bg-rose-900/50 hover:text-rose-100"
            onClick={onDeleteConversation}
            title="Delete chat"
            aria-label="Delete chat"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-cyan-300/20 bg-slate-900/62 p-5 text-sm text-slate-300">
              브레인스토밍할 과제, 아이디어, 기획 주제를 입력하세요.
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="grid gap-2">
                <MessageBubble message={message} />
                {message.agentOpinions?.length ? (
                  <AgentOpinionPanel opinions={message.agentOpinions} />
                ) : null}
              </div>
            ))
          )}

          {isSending ? <ThinkingIndicator /> : null}

          {suggestedQuestions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="rounded-md border border-cyan-300/20 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                  onClick={() => onSuggestedQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <form className="border-t border-cyan-300/10 bg-slate-950/92 p-3" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <textarea
            className="min-h-11 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            rows={2}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={sendBlockedReason || '메시지를 입력하세요'}
            disabled={isSending}
          />
          <button
            type="submit"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-500/22 text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-400/24 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:ring-slate-700"
            disabled={isSending || !input.trim() || !canSend}
            title="Send"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
