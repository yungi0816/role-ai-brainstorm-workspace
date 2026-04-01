import { memo, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ListTodo,
  Pencil,
  Save,
  Send,
  Sparkles,
  Wrench,
  X
} from 'lucide-react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const TYPE_LABEL = {
  idea: 'Idea',
  risk: 'Risk',
  feature: 'Feature',
  task: 'Task',
  decision: 'Decision',
  question: 'Question'
};

const NODE_TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));

const TYPE_STYLE = {
  idea: {
    border: '#22d3ee',
    background: 'rgba(8, 47, 73, 0.92)',
    iconBackground: 'rgba(34, 211, 238, 0.16)',
    Icon: Lightbulb
  },
  risk: {
    border: '#fb7185',
    background: 'rgba(76, 5, 25, 0.9)',
    iconBackground: 'rgba(251, 113, 133, 0.16)',
    Icon: AlertTriangle
  },
  feature: {
    border: '#818cf8',
    background: 'rgba(30, 27, 75, 0.9)',
    iconBackground: 'rgba(129, 140, 248, 0.16)',
    Icon: Sparkles
  },
  task: {
    border: '#f59e0b',
    background: 'rgba(69, 39, 8, 0.9)',
    iconBackground: 'rgba(245, 158, 11, 0.16)',
    Icon: ListTodo
  },
  decision: {
    border: '#34d399',
    background: 'rgba(6, 78, 59, 0.88)',
    iconBackground: 'rgba(52, 211, 153, 0.16)',
    Icon: CheckCircle2
  },
  question: {
    border: '#a78bfa',
    background: 'rgba(46, 16, 101, 0.9)',
    iconBackground: 'rgba(167, 139, 250, 0.16)',
    Icon: HelpCircle
  }
};

const nodeTypes = {
  mindMap: memo(MindMapNode)
};

function normalizeParentId(node) {
  return node?.parent_id || node?.parentId || null;
}

function createGraph(sourceNodes, sourceEdges) {
  const nodeIds = new Set(sourceNodes.map((node) => node.id));
  const links = [];
  const linkKeys = new Set();
  const incoming = new Map(sourceNodes.map((node) => [node.id, 0]));

  function addLink(edge, visual = false) {
    const source = edge?.source;
    const target = edge?.target;
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
      return;
    }

    const key = `${source}->${target}`;
    if (linkKeys.has(key)) {
      return;
    }

    linkKeys.add(key);
    links.push({ ...edge, visual });
    incoming.set(target, (incoming.get(target) || 0) + 1);
  }

  for (const edge of sourceEdges) {
    addLink(edge, false);
  }

  for (const node of sourceNodes) {
    const parentId = normalizeParentId(node);
    if (parentId) {
      addLink({
        id: `visual-parent-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        label: ''
      }, true);
    }
  }

  const explicitRoot = sourceNodes.find((node) => !normalizeParentId(node));
  const roots = sourceNodes.filter((node) => (incoming.get(node.id) || 0) === 0);
  const primaryRoot = explicitRoot || roots[0] || sourceNodes[0] || null;

  if (primaryRoot) {
    for (const root of roots) {
      if (root.id === primaryRoot.id) {
        continue;
      }

      addLink({
        id: `visual-root-${primaryRoot.id}-${root.id}`,
        source: primaryRoot.id,
        target: root.id,
        label: ''
      }, true);
    }
  }

  return {
    links,
    rootId: primaryRoot?.id || null
  };
}

/**
 * 중앙 셀 기반 4방향 확산 레이아웃 계산 함수
 * 중앙의 큰 셀을 중심으로 자식 노드들을 상하좌우로 배치합니다.
 */
function computeSpreadingLayout(sourceNodes, links, rootId) {
  const childrenById = new Map(sourceNodes.map((node) => [node.id, []]));
  for (const link of links) {
    if (childrenById.has(link.source)) {
      childrenById.get(link.source).push(link.target);
    }
  }

  const positions = new Map();
  const visited = new Set();

  const horizGap = 360;
  const vertGap = 160;

  function placeNodesRecursive(id, x, y, direction) {
    if (visited.has(id)) return;
    visited.add(id);

    positions.set(id, { x, y });

    const children = childrenById.get(id) || [];
    if (children.length === 0) return;

    if (direction === 'left' || direction === 'right') {
      const totalHeight = (children.length - 1) * vertGap;
      let startY = y - totalHeight / 2;

      children.forEach((childId, index) => {
        const nextX = x + (direction === 'left' ? -horizGap : horizGap);
        const nextY = startY + index * vertGap;
        placeNodesRecursive(childId, nextX, nextY, direction);
      });
    } else {
      const totalWidth = (children.length - 1) * horizGap;
      let startX = x - totalWidth / 2;

      children.forEach((childId, index) => {
        const nextX = startX + index * horizGap;
        const nextY = y + (direction === 'top' ? -vertGap : vertGap);
        placeNodesRecursive(childId, nextX, nextY, direction);
      });
    }
  }

  if (rootId) {
    visited.add(rootId);
    positions.set(rootId, { x: 0, y: 0 });

    const children = childrenById.get(rootId) || [];
    if (children.length > 0) {
      const rightChildren = [];
      const leftChildren = [];
      const bottomChildren = [];
      const topChildren = [];

      children.forEach((id, i) => {
        if (i % 4 === 0) rightChildren.push(id);
        else if (i % 4 === 1) leftChildren.push(id);
        else if (i % 4 === 2) bottomChildren.push(id);
        else topChildren.push(id);
      });

      const rH = (rightChildren.length - 1) * vertGap;
      rightChildren.forEach((id, i) => placeNodesRecursive(id, horizGap, -rH/2 + i * vertGap, 'right'));

      const lH = (leftChildren.length - 1) * vertGap;
      leftChildren.forEach((id, i) => placeNodesRecursive(id, -horizGap, -lH/2 + i * vertGap, 'left'));

      const bW = (bottomChildren.length - 1) * horizGap;
      bottomChildren.forEach((id, i) => placeNodesRecursive(id, -bW/2 + i * horizGap, vertGap, 'bottom'));

      const tW = (topChildren.length - 1) * horizGap;
      topChildren.forEach((id, i) => placeNodesRecursive(id, -tW/2 + i * horizGap, -vertGap, 'top'));
    }
  }

  let orphanIdx = 0;
  for (const node of sourceNodes) {
    if (!visited.has(node.id)) {
      positions.set(node.id, { x: 0, y: (orphanIdx + 2) * vertGap });
      orphanIdx++;
    }
  }

  return positions;
}

function MindMapNode({ data, selected }) {
  const tone = TYPE_STYLE[data.raw.type] || TYPE_STYLE.idea;
  const Icon = tone.Icon || Wrench;

  return (
    <div
      className={[
        'mindmap-node-card',
        data.isRoot ? 'mindmap-node-card-root' : 'mindmap-node-card-branch',
        selected ? 'is-selected' : ''
      ].join(' ')}
      style={{
        '--node-border': tone.border,
        '--node-bg': tone.background,
        '--node-icon-bg': tone.iconBackground,
        minWidth: data.isRoot ? '260px' : '180px',
        padding: '16px'
      }}
    >
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />

      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />

      <div className="mindmap-node-card-header" style={{ marginBottom: '8px' }}>
        <span className="mindmap-node-icon">
          <Icon size={data.isRoot ? 24 : 16} />
        </span>
        <span className="mindmap-node-type">{TYPE_LABEL[data.raw.type] || data.raw.type}</span>
      </div>
      <div className="mindmap-node-label" style={{ wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
        {data.label}
      </div>
      {data.isRoot && data.raw.description ? (
        <div className="mindmap-node-description">{data.raw.description}</div>
      ) : null}
    </div>
  );
}

function MiniMapNode({ x, y, width, height, color }) {
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(width, 42)}
      height={Math.max(height, 22)}
      rx={6}
      ry={6}
      fill={color || '#38bdf8'}
      stroke="#e0f2fe"
      strokeWidth={6}
    />
  );
}

function toFlowNode(node, position, selectedNode, rootId) {
  const isSelected = selectedNode?.id === node.id;
  const isRoot = node.id === rootId;
  const width = isRoot ? 260 : 180;
  const height = isRoot ? 140 : 80;

  return {
    id: node.id,
    type: 'mindMap',
    position,
    width,
    height,
    data: {
      label: node.label,
      raw: node,
      isRoot
    },
    selected: isSelected
  };
}

function toFlowEdge(edge, positions) {
  const isVisual = Boolean(edge.visual);
  const sourcePos = positions.get(edge.source);
  const targetPos = positions.get(edge.target);

  let sourceHandle = 'right';
  let targetHandle = 'left';

  if (sourcePos && targetPos) {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        sourceHandle = 'right';
        targetHandle = 'left';
      } else {
        sourceHandle = 'left';
        targetHandle = 'right';
      }
    } else {
      if (dy > 0) {
        sourceHandle = 'bottom';
        targetHandle = 'top';
      } else {
        sourceHandle = 'top';
        targetHandle = 'bottom';
      }
    }
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle,
    targetHandle,
    type: 'bezier',
    animated: !isVisual,
    style: {
      stroke: isVisual ? '#475569' : '#0e7490',
      strokeWidth: 2,
      strokeDasharray: isVisual ? '5 8' : undefined
    }
  };
}

function createNodeDraft(node) {
  return {
    label: node?.label || '',
    type: node?.type || 'idea',
    description: node?.description || '',
    parentId: normalizeParentId(node) || ''
  };
}

function SelectedNodePanel({ node, nodes, onAskQuestion, onUpdateNode, isSending }) {
  const [question, setQuestion] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(createNodeDraft(node));

  useEffect(() => {
    setQuestion('');
    setIsEditing(false);
    setDraft(createNodeDraft(node));
  }, [node?.id]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(createNodeDraft(node));
    }
  }, [node, isEditing]);

  if (!node) {
    return (
      <div className="border-t border-cyan-300/10 bg-slate-950/84 px-5 py-3 text-xs text-slate-400">
        노드를 선택하면 세부 정보를 볼 수 있습니다.
      </div>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const content = question.trim();
    if (!content || isSending) {
      return;
    }

    onAskQuestion(content);
    setQuestion('');
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!draft.label.trim() || isSaving || isSending) {
      return;
    }

    const isRoot = !normalizeParentId(node);
    setIsSaving(true);
    try {
      const saved = await onUpdateNode(node.id, {
        label: draft.label.trim(),
        type: draft.type,
        description: draft.description.trim(),
        parentId: isRoot ? null : draft.parentId || null
      });
      if (saved !== false) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleQuestionKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const isRoot = !normalizeParentId(node);
  const parentOptions = (nodes || []).filter((candidate) => candidate.id !== node.id);

  return (
    <div className="border-t border-cyan-300/10 bg-slate-950/92 px-5 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-50">{node.label}</div>
          <div className="mt-1 text-xs text-slate-400">{TYPE_LABEL[node.type] || node.type}</div>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
          onClick={() => setIsEditing((value) => !value)}
          title={isEditing ? 'Cancel editing' : 'Edit node'}
          aria-label={isEditing ? 'Cancel editing' : 'Edit node'}
          disabled={isSending || isSaving}
        >
          {isEditing ? <X size={15} /> : <Pencil size={15} />}
        </button>
      </div>

      {isEditing ? (
        <form className="grid gap-2" onSubmit={handleEditSubmit}>
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            value={draft.label}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            placeholder="Node label"
            disabled={isSaving}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
              disabled={isSaving}
            >
              {NODE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10 disabled:text-slate-500"
              value={draft.parentId}
              onChange={(event) => setDraft((current) => ({ ...current, parentId: event.target.value }))}
              disabled={isRoot || isSaving}
              title={isRoot ? 'Root node parent cannot be changed' : 'Parent node'}
            >
              <option value="">Root</option>
              {parentOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
            </select>
          </div>
          <textarea
            className="min-h-16 resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            rows={3}
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="Node description"
            disabled={isSaving}
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500/22 px-3 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-400/24 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:ring-slate-700"
            disabled={isSaving || isSending || !draft.label.trim()}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save node'}
          </button>
        </form>
      ) : (
        <p className="line-clamp-3 text-xs leading-5 text-slate-400">
          {node.description || 'No description.'}
        </p>
      )}

      <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <textarea
            id="node-question"
            className="min-h-10 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="이 노드에 대해 질문하기..."
            disabled={isSending}
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-500/22 text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-400/24 disabled:cursor-not-allowed"
            disabled={isSending || !question.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MindMapFlow({ flowNodes, flowEdges, isSending, onSelectNode }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    fitView({ padding: 0.2, duration: 600 });
  }, [flowNodes.length, fitView]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      minZoom={0.05}
      maxZoom={2}
      nodesDraggable={true}
      onNodeClick={(e, node) => onSelectNode(node.data.raw)}
      onPaneClick={() => onSelectNode(null)}
      fitView
      className="mindmap-flow"
      deletePerspective={true}
    >
      <Background color="#164e63" gap={24} size={1} />
      <Controls position="top-left" showInteractive={false} />
      <MiniMap
        position="bottom-right"
        style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(34, 211, 238, 0.2)' }}
        nodeColor={(node) => TYPE_STYLE[node.data.raw.type]?.border || '#22d3ee'}
        maskColor="rgba(2, 6, 23, 0.7)"
      />
    </ReactFlow>
  );
}

export default function MindMapPanel({
  mindmap,
  selectedNode,
  onSelectNode,
  onAskNodeQuestion,
  onUpdateNode,
  isSending
}) {
  const sourceNodes = mindmap?.nodes || [];
  const sourceEdges = mindmap?.edges || [];

  const graph = useMemo(() => createGraph(sourceNodes, sourceEdges), [sourceNodes, sourceEdges]);
  const positions = useMemo(() => computeSpreadingLayout(sourceNodes, graph.links, graph.rootId), [sourceNodes, graph]);
  const flowNodes = useMemo(() => sourceNodes.map((node) => toFlowNode(node, positions.get(node.id) || { x: 0, y: 0 }, selectedNode, graph.rootId)), [sourceNodes, positions, selectedNode, graph.rootId]);
  const flowEdges = useMemo(() => graph.links.map((edge) => toFlowEdge(edge, positions)), [graph.links, positions]);

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/92">
      <div className="window-drag border-b border-cyan-300/10 px-5 py-3 pr-24">
        <h2 className="text-sm font-semibold text-slate-50">Brainstorming Mind Map</h2>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-950">
        {flowNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">대화를 시작하여 마인드맵을 생성하세요.</div>
        ) : (
          <ReactFlowProvider>
            <MindMapFlow flowNodes={flowNodes} flowEdges={flowEdges} onSelectNode={onSelectNode} />
          </ReactFlowProvider>
        )}
      </div>

      <SelectedNodePanel
        node={selectedNode}
        nodes={sourceNodes}
        onAskQuestion={onAskNodeQuestion}
        onUpdateNode={onUpdateNode}
        isSending={isSending}
      />
    </section>
  );
}
