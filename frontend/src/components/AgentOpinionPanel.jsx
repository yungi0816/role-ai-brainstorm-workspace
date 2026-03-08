const ROLE_TONE = {
  '아이디어 뱅크': 'border-cyan-200 bg-cyan-50',
  '비판가': 'border-rose-200 bg-rose-50',
  '검토자': 'border-amber-200 bg-amber-50',
  '구현 설계자': 'border-indigo-200 bg-indigo-50',
  '정리자': 'border-emerald-200 bg-emerald-50'
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
          className={`rounded-md border p-3 ${ROLE_TONE[item.role] || 'border-slate-200 bg-slate-50'}`}
        >
          <div className="mb-1 text-xs font-semibold text-slate-700">{item.role}</div>
          <p className="text-sm leading-6 text-slate-800">{item.opinion}</p>
        </article>
      ))}
    </div>
  );
}
