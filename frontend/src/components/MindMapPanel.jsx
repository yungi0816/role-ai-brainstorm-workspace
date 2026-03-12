import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import {
  Background,
  Controls,
  MiniMap,
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
  idea: { border: '#22d3ee', background: 'rgba(8, 47, 73, 0.92)' },
  risk: { border: '#fb7185', background: 'rgba(76, 5, 25, 0.9)' },
  feature: { border: '#818cf8', background: 'rgba(30, 27, 75, 0.9)' },
  task: { border: '#f59e0b', background: 'rgba(69, 39, 8, 0.9)' },
  decision: { border: '#34d399', background: 'rgba(6, 78, 59, 0.88)' },
  question: { border: '#a78bfa', background: 'rgba(46, 16, 101, 0.9)' }
};

function getNodePosition(node, index) {
  const x = Number(node.x);
  const y = Number(node.y);

  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y };
  }

  return {
    x: (index % 4) * 240,
    y: Math.floor(index / 4) * 160
  };
}

function toFlowNode(node, index, selectedNode) {
  const tone = TYPE_STYLE[node.type] || TYPE_STYLE.idea;
  const isSelected = selectedNode?.id === node.id;

  return {
    id: node.id,
    position: getNodePosition(node, index),
    data: {
      label: node.label,
      raw: node
    },
    className: 'mindmap-node',
    selected: isSelected,
    style: {
      width: 184,
      minHeight: 64,
      border: `1px solid ${tone.border}`,
      borderRadius: 8,
      background: tone.background,
      color: '#f8fafc',
      fontSize: 13,
      fontWeight: 600,
      padding: 10,
      boxShadow: isSelected
        ? '0 20px 42px rgba(34, 211, 238, 0.22), 0 0 0 2px rgba(34, 211, 238, 0.24)'
        : '0 14px 34px rgba(0, 0, 0, 0.34)',
      transform: isSelected
        ? 'perspective(900px) rotateX(2deg) translateZ(14px)'
        : 'perspective(900px) rotateX(3deg)'
    }
  };
}

function toFlowEdge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || undefined,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#0e7490',
      strokeWidth: 2,
      filter: 'drop-shadow(0 0 7px rgba(14, 116, 144, 0.34))'
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
  const flowNodes = useMemo(
    () => sourceNodes.map((node, index) => toFlowNode(node, index, selectedNode)),
    [sourceNodes, selectedNode]
  );
  const flowEdges = useMemo(
    () => sourceEdges.map(toFlowEdge),
    [sourceEdges]
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/92 shadow-2xl shadow-cyan-950/30">
      <div className="border-b border-cyan-300/10 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-50">Mind Map</h2>
          <div className="text-xs text-slate-400">
            {sourceNodes.length} nodes / {sourceEdges.length} edges
          </div>
        </div>
      </div>

      <div className="mindmap-orbit-surface relative min-h-0 flex-1 overflow-hidden bg-slate-950">
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
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.35}
              maxZoom={1.6}
              nodesDraggable={false}
              onNodeClick={(event, node) => onSelectNode(node.data.raw)}
              onPaneClick={() => onSelectNode(null)}
            >
              <Background color="#164e63" gap={18} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => TYPE_STYLE[node.data.raw.type]?.border || '#0891b2'}
                maskColor="rgba(241, 245, 249, 0.72)"
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
