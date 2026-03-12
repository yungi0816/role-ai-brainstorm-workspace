const ROLE_TONE = {
  '아이디어 뱅크': 'border-cyan-300/20 bg-cyan-500/10',
  '비판가': 'border-rose-300/20 bg-rose-500/10',
  '검토자': 'border-amber-300/20 bg-amber-500/10',
  '구현 설계자': 'border-indigo-300/20 bg-indigo-500/10',
  '정리자': 'border-emerald-300/20 bg-emerald-500/10'
};

export default function AgentOpinionPanel({ opinions }) {
  if (!opinions?.length) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {opinions.map((item) => (
        <article
          key={`${item.role}-${item.opinion}`}
          className={`rounded-md border p-3 ${ROLE_TONE[item.role] || 'border-slate-700 bg-slate-900/70'}`}
        >
          <div className="mb-1 text-xs font-semibold text-slate-200">{item.role}</div>
          <p className="text-sm leading-6 text-slate-300">{item.opinion}</p>
        </article>
      ))}
    </div>
  );
}
