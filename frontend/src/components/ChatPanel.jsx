import { Send } from 'lucide-react';
import AgentOpinionPanel from './AgentOpinionPanel.jsx';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm',
          isUser
            ? 'bg-cyan-700 text-white'
            : message.isError
              ? 'border border-rose-200 bg-rose-50 text-rose-900'
              : 'border border-slate-200 bg-white text-slate-900'
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
  onSuggestedQuestion
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-3">
        <h1 className="text-base font-semibold text-slate-950">Role AI Brainstorm Workspace</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
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
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-cyan-600 hover:text-cyan-700"
                  onClick={() => onSuggestedQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <form className="border-t border-slate-200 bg-white p-4" onSubmit={onSubmit}>
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            className="min-h-12 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            rows={2}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="메시지를 입력하세요"
            disabled={isSending}
          />
          <button
            type="submit"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-cyan-700 text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
