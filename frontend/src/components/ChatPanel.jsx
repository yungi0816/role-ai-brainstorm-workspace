import { Globe2, MessageCircle, Send, Settings } from 'lucide-react';
import AgentOpinionPanel from './AgentOpinionPanel.jsx';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm',
          isUser
            ? 'bg-cyan-500/18 text-cyan-50 ring-1 ring-cyan-300/20'
            : message.isError
              ? 'border border-rose-300/30 bg-rose-950/70 text-rose-100'
              : 'border border-slate-700/80 bg-slate-900/86 text-slate-100'
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
  model
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
            {providerLabel} / {model}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-cyan-300/20 bg-slate-900/62 p-5 text-sm text-slate-300">
              브레인스토밍할 과제, 아이디어, 기획 주제를 입력하세요.
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}

          <AgentOpinionPanel opinions={agentOpinions} />

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
            placeholder="메시지를 입력하세요"
            disabled={isSending}
          />
          <button
            type="submit"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-500/22 text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-400/24 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:ring-slate-700"
            disabled={isSending || !input.trim()}
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
