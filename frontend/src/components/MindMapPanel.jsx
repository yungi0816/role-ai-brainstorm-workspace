import { memo, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ListTodo,
  Send,
  Sparkles,
  Wrench
} from 'lucide-react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider
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

function computeTreeLayout(sourceNodes, links, rootId) {
  const childrenById = new Map(sourceNodes.map((node) => [node.id, []]));
  const nodeById = new Map(sourceNodes.map((node, index) => [node.id, { node, index }]));

  for (const link of links) {
    if (!childrenById.has(link.source) || !nodeById.has(link.target)) {
      continue;
    }

    childrenById.get(link.source).push(link.target);
  }

  for (const children of childrenById.values()) {
    children.sort((a, b) => nodeById.get(a).index - nodeById.get(b).index);
  }

  const positions = new Map();
  const visited = new Set();
  let nextLeaf = 0;
  const depthGap = 290;
  const verticalGap = 132;

  function placeNode(id, depth, stack = new Set()) {
    if (stack.has(id)) {
      return nextLeaf * verticalGap;
    }

    if (visited.has(id)) {
      return positions.get(id)?.y || 0;
    }

    visited.add(id);
    const nextStack = new Set(stack);
    nextStack.add(id);

    const childIds = (childrenById.get(id) || []).filter((childId) => !stack.has(childId));
    let y;

    if (childIds.length === 0) {
      y = nextLeaf * verticalGap;
      nextLeaf += 1;
    } else {
      const childYs = childIds.map((childId) => placeNode(childId, depth + 1, nextStack));
      y = childYs.reduce((sum, childY) => sum + childY, 0) / childYs.length;
    }

    positions.set(id, {
      x: depth * depthGap,
      y
    });

    return y;
  }

  if (rootId) {
    placeNode(rootId, 0);
  }

  for (const node of sourceNodes) {
    if (!visited.has(node.id)) {
      placeNode(node.id, 1);
    }
  }

  const rootY = positions.get(rootId)?.y || 0;
  for (const [id, position] of positions) {
    positions.set(id, {
      x: position.x,
      y: position.y - rootY
    });
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
        '--node-icon-bg': tone.iconBackground
      }}
    >
      <Handle className="mindmap-handle" type="target" position={Position.Left} />
      <Handle className="mindmap-handle" type="source" position={Position.Right} />
      <div className="mindmap-node-card-header">
        <span className="mindmap-node-icon">
          <Icon size={data.isRoot ? 22 : 16} />
        </span>
        <span className="mindmap-node-type">{TYPE_LABEL[data.raw.type] || data.raw.type}</span>
      </div>
      <div className="mindmap-node-label">{data.label}</div>
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
  const width = isRoot ? 260 : 174;
  const height = isRoot ? 138 : 74;

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
    selected: isSelected,
    style: {
      width,
      height
    }
  };
}

function toFlowEdge(edge) {
  const isVisual = Boolean(edge.visual);

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: isVisual ? undefined : edge.label || undefined,
    type: 'smoothstep',
    animated: !isVisual,
    style: {
      stroke: isVisual ? '#475569' : '#0e7490',
      strokeWidth: isVisual ? 1.5 : 2,
      strokeDasharray: isVisual ? '5 8' : undefined,
      filter: isVisual ? undefined : 'drop-shadow(0 0 7px rgba(14, 116, 144, 0.34))'
    },
    labelStyle: {
      fill: '#cbd5e1',
      fontSize: 11,
      fontWeight: 600
    },
    labelBgStyle: {
      fill: '#020617',
      fillOpacity: 0.76
    }
  };
}

function SelectedNodePanel({ node, onAskQuestion, isSending }) {
  const [question, setQuestion] = useState('');

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

  function handleQuestionKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="border-t border-cyan-300/10 bg-slate-950/92 px-5 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-50">{node.label}</div>
          <div className="mt-1 text-xs text-slate-400">{TYPE_LABEL[node.type] || node.type}</div>
        </div>
        {node.parent_id || node.parentId ? (
          <span className="shrink-0 rounded border border-cyan-300/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-400">
            child
          </span>
        ) : null}
      </div>
      <p className="line-clamp-3 text-xs leading-5 text-slate-400">
        {node.description || 'No description.'}
      </p>
      <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold text-slate-300" htmlFor="node-question">
          이 노드에 대해 질문하기
        </label>
        <div className="flex gap-2">
          <textarea
            id="node-question"
            className="min-h-10 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="예: 이 노드를 더 구체화해줘"
            disabled={isSending}
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-500/22 text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-400/24 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:ring-slate-700"
            disabled={isSending || !question.trim()}
            title="Ask about selected node"
            aria-label="Ask about selected node"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MindMapPanel({
  mindmap,
  selectedNode,
  onSelectNode,
  onAskNodeQuestion,
  isSending
}) {
  const sourceNodes = mindmap?.nodes || [];
  const sourceEdges = mindmap?.edges || [];
  const graph = useMemo(
    () => createGraph(sourceNodes, sourceEdges),
    [sourceNodes, sourceEdges]
  );
  const positions = useMemo(
    () => computeTreeLayout(sourceNodes, graph.links, graph.rootId),
    [sourceNodes, graph]
  );
  const flowNodes = useMemo(
    () => sourceNodes.map((node) => toFlowNode(
      node,
      positions.get(node.id) || { x: 0, y: 0 },
      selectedNode,
      graph.rootId
    )),
    [sourceNodes, positions, selectedNode, graph.rootId]
  );
  const flowEdges = useMemo(
    () => graph.links.map(toFlowEdge),
    [graph.links]
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/92 shadow-2xl shadow-cyan-950/30">
      <div className="window-drag border-b border-cyan-300/10 px-5 py-3 pr-24">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-50">Mind Map</h2>
          <div className="text-xs text-slate-400">
            {sourceNodes.length} nodes / {sourceEdges.length} edges
          </div>
        </div>
      </div>

      <div className="mindmap-orbit-surface relative min-h-0 flex-1 overflow-hidden bg-slate-950">
        {isSending ? (
          <div className="mindmap-progress window-no-drag pointer-events-none absolute right-4 top-4 z-20 w-[min(280px,calc(100%-32px))] rounded-md border border-cyan-300/20 bg-slate-950/88 px-3 py-2 shadow-lg shadow-cyan-950/30">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Updating mind map
            </div>
            <div className="progress-track">
              <span />
            </div>
          </div>
        ) : null}
        {flowNodes.length === 0 ? (
          <div className="absolute inset-4 flex items-center justify-center rounded-md border border-dashed border-cyan-300/20 bg-slate-900/70 text-sm text-slate-400">
            마인드맵 노드가 없습니다.
          </div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              className="mindmap-flow"
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.28 }}
              minZoom={0.35}
              maxZoom={1.8}
              nodesDraggable={false}
              onNodeClick={(event, node) => onSelectNode(node.data.raw)}
              onPaneClick={() => onSelectNode(null)}
            >
              <Background color="#164e63" gap={18} size={1} />
              <Controls
                className="mindmap-controls"
                position="top-left"
                showInteractive={false}
                style={{ left: 12, top: 12, bottom: 'auto' }}
              />
              <MiniMap
                className="mindmap-minimap"
                position="top-left"
                pannable
                zoomable
                bgColor="rgba(15, 23, 42, 0.94)"
                nodeComponent={MiniMapNode}
                nodeColor={(node) => TYPE_STYLE[node.data.raw.type]?.border || '#0891b2'}
                nodeStrokeColor={(node) => TYPE_STYLE[node.data.raw.type]?.border || '#0891b2'}
                nodeStrokeWidth={3}
                nodeBorderRadius={4}
                maskColor="rgba(2, 6, 23, 0.44)"
                maskStrokeColor="rgba(34, 211, 238, 0.62)"
                maskStrokeWidth={1.5}
                style={{
                  left: 62,
                  top: 12,
                  bottom: 'auto',
                  right: 'auto',
                  width: 168,
                  height: 108
                }}
              />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>

      <SelectedNodePanel
        key={selectedNode?.id || 'empty-node'}
        node={selectedNode}
        onAskQuestion={onAskNodeQuestion}
        isSending={isSending}
      />
    </section>
  );
}
