const TYPE_LABEL = {
  idea: 'Idea',
  risk: 'Risk',
  feature: 'Feature',
  task: 'Task',
  decision: 'Decision',
  question: 'Question'
};

export default function MindMapPanel({ mindmap, selectedNode, onSelectNode }) {
  const nodes = mindmap?.nodes || [];
  const edges = mindmap?.edges || [];

  return (
    <aside className="flex min-h-0 w-full flex-col bg-white lg:w-[44%]">
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-950">Mind Map</h2>
          <div className="text-xs text-slate-500">
            {nodes.length} nodes / {edges.length} edges
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {nodes.length === 0 ? (
          <div className="flex h-full min-h-64 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            마인드맵 노드가 없습니다.
          </div>
        ) : (
          <div className="grid gap-2">
            {nodes.map((node) => {
              const active = selectedNode?.id === node.id;

              return (
                <button
                  key={node.id}
                  type="button"
                  className={[
                    'rounded-md border p-3 text-left transition',
                    active
                      ? 'border-cyan-600 bg-cyan-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  ].join(' ')}
                  onClick={() => onSelectNode(node)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{node.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{TYPE_LABEL[node.type] || node.type}</div>
                    </div>
                    {node.parent_id || node.parentId ? (
                      <span className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                        parent
                      </span>
                    ) : null}
                  </div>
                  {node.description ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{node.description}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
