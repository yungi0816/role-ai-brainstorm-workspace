import { useMemo } from 'react';
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
  idea: { border: '#0891b2', background: '#ecfeff' },
  risk: { border: '#e11d48', background: '#fff1f2' },
  feature: { border: '#4f46e5', background: '#eef2ff' },
  task: { border: '#d97706', background: '#fffbeb' },
  decision: { border: '#059669', background: '#ecfdf5' },
  question: { border: '#7c3aed', background: '#f5f3ff' }
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

  return {
    id: node.id,
    position: getNodePosition(node, index),
    data: {
      label: node.label,
      raw: node
    },
    selected: selectedNode?.id === node.id,
    style: {
      width: 184,
      minHeight: 64,
      border: `1px solid ${tone.border}`,
      borderRadius: 8,
      background: tone.background,
      color: '#0f172a',
      fontSize: 13,
      fontWeight: 600,
      padding: 10,
      boxShadow: selectedNode?.id === node.id ? '0 0 0 2px rgba(8, 145, 178, 0.22)' : 'none'
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
    animated: false,
    style: {
      stroke: '#64748b',
      strokeWidth: 1.5
    },
    labelStyle: {
      fill: '#475569',
      fontSize: 11,
      fontWeight: 600
    },
    labelBgStyle: {
      fill: '#ffffff',
      fillOpacity: 0.86
    }
  };
}

function SelectedNodePanel({ node }) {
  if (!node) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
        Select a node to inspect details.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-white px-5 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">{node.label}</div>
          <div className="mt-1 text-xs text-slate-500">{TYPE_LABEL[node.type] || node.type}</div>
        </div>
        {node.parent_id || node.parentId ? (
          <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
            child
          </span>
        ) : null}
      </div>
      <p className="line-clamp-3 text-xs leading-5 text-slate-600">
        {node.description || 'No description.'}
      </p>
    </div>
  );
}

export default function MindMapPanel({ mindmap, selectedNode, onSelectNode }) {
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
    <aside className="flex min-h-0 w-full flex-col bg-white lg:w-[44%]">
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-950">Mind Map</h2>
          <div className="text-xs text-slate-500">
            {sourceNodes.length} nodes / {sourceEdges.length} edges
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-50">
        {flowNodes.length === 0 ? (
          <div className="absolute inset-4 flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            마인드맵 노드가 없습니다.
          </div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
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
              <Background color="#cbd5e1" gap={18} size={1} />
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

      <SelectedNodePanel node={selectedNode} />
    </aside>
  );
}
