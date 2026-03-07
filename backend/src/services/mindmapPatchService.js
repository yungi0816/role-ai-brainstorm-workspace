import { MINDMAP_NODE_TYPES } from '../providers/baseProvider.js';
import { getDatabase } from '../db/database.js';
import { getMindmap } from './conversationService.js';

const EMPTY_PATCH = {
  addNodes: [],
  updateNodes: [],
  removeNodes: [],
  addEdges: [],
  updateEdges: [],
  removeEdges: []
};

function asString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function asNullableString(value) {
  const text = asString(value);
  return text || null;
}

function asNodeType(value) {
  return MINDMAP_NODE_TYPES.includes(value) ? value : 'idea';
}

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePatch(patch) {
  return {
    ...EMPTY_PATCH,
    ...(patch && typeof patch === 'object' ? patch : {})
  };
}

function getNode(db, id) {
  return db.prepare('SELECT * FROM mindmap_nodes WHERE id = ?').get(id);
}

function nodeExistsInConversation(db, conversationId, id) {
  return Boolean(
    db.prepare(`
      SELECT 1
      FROM mindmap_nodes
      WHERE conversation_id = ? AND id = ?
    `).get(conversationId, id)
  );
}

function edgeExistsInConversation(db, conversationId, id) {
  return Boolean(
    db.prepare(`
      SELECT 1
      FROM mindmap_edges
      WHERE conversation_id = ? AND id = ?
    `).get(conversationId, id)
  );
}

function getNodeCount(db, conversationId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM mindmap_nodes
    WHERE conversation_id = ?
  `).get(conversationId).count;
}

function getPositionForIndex(index) {
  return {
    x: (index % 4) * 240,
    y: Math.floor(index / 4) * 160
  };
}

function applyAddNode(db, conversationId, node, positionIndex, applied) {
  const id = asString(node.id);
  const label = asString(node.label);
  if (!id || !label) {
    applied.skippedNodes += 1;
    return;
  }

  const existing = getNode(db, id);
  if (existing && existing.conversation_id !== conversationId) {
    applied.skippedNodes += 1;
    return;
  }

  const position = getPositionForIndex(positionIndex);
  const payload = {
    id,
    conversation_id: conversationId,
    label,
    type: asNodeType(node.type),
    parent_id: asNullableString(node.parentId),
    description: asString(node.description),
    x: asNumber(node.x, position.x),
    y: asNumber(node.y, position.y)
  };

  if (existing) {
    db.prepare(`
      UPDATE mindmap_nodes
      SET label = @label,
          type = @type,
          parent_id = @parent_id,
          description = @description,
          x = @x,
          y = @y,
          updated_at = datetime('now')
      WHERE conversation_id = @conversation_id AND id = @id
    `).run(payload);
    applied.updatedNodes += 1;
    return;
  }

  db.prepare(`
    INSERT INTO mindmap_nodes (
      id,
      conversation_id,
      label,
      type,
      parent_id,
      description,
      x,
      y
    )
    VALUES (
      @id,
      @conversation_id,
      @label,
      @type,
      @parent_id,
      @description,
      @x,
      @y
    )
  `).run(payload);
  applied.addedNodes += 1;
}

function applyUpdateNode(db, conversationId, node, applied) {
  const id = asString(node.id);
  if (!id || !nodeExistsInConversation(db, conversationId, id)) {
    applied.skippedNodes += 1;
    return;
  }

  const existing = getNode(db, id);
  const payload = {
    id,
    conversation_id: conversationId,
    label: asString(node.label) || existing.label,
    type: node.type ? asNodeType(node.type) : existing.type,
    parent_id: node.parentId === undefined ? existing.parent_id : asNullableString(node.parentId),
    description: node.description === undefined ? existing.description : asString(node.description),
    x: node.x === undefined ? existing.x : asNumber(node.x, existing.x),
    y: node.y === undefined ? existing.y : asNumber(node.y, existing.y)
  };

  db.prepare(`
    UPDATE mindmap_nodes
    SET label = @label,
        type = @type,
        parent_id = @parent_id,
        description = @description,
        x = @x,
        y = @y,
        updated_at = datetime('now')
    WHERE conversation_id = @conversation_id AND id = @id
  `).run(payload);
  applied.updatedNodes += 1;
}

function applyAddEdge(db, conversationId, edge, applied) {
  const id = asString(edge.id);
  const source = asString(edge.source);
  const target = asString(edge.target);

  if (
    !id ||
    !source ||
    !target ||
    !nodeExistsInConversation(db, conversationId, source) ||
    !nodeExistsInConversation(db, conversationId, target)
  ) {
    applied.skippedEdges += 1;
    return;
  }

  const payload = {
    id,
    conversation_id: conversationId,
    source,
    target,
    label: asString(edge.label)
  };

  if (edgeExistsInConversation(db, conversationId, id)) {
    db.prepare(`
      UPDATE mindmap_edges
      SET source = @source,
          target = @target,
          label = @label
      WHERE conversation_id = @conversation_id AND id = @id
    `).run(payload);
    applied.updatedEdges += 1;
    return;
  }

  db.prepare(`
    INSERT INTO mindmap_edges (id, conversation_id, source, target, label)
    VALUES (@id, @conversation_id, @source, @target, @label)
  `).run(payload);
  applied.addedEdges += 1;
}

function applyUpdateEdge(db, conversationId, edge, applied) {
  const id = asString(edge.id);
  if (!id || !edgeExistsInConversation(db, conversationId, id)) {
    applied.skippedEdges += 1;
    return;
  }

  const existing = db.prepare(`
    SELECT *
    FROM mindmap_edges
    WHERE conversation_id = ? AND id = ?
  `).get(conversationId, id);
  const source = asString(edge.source) || existing.source;
  const target = asString(edge.target) || existing.target;

  if (
    !nodeExistsInConversation(db, conversationId, source) ||
    !nodeExistsInConversation(db, conversationId, target)
  ) {
    applied.skippedEdges += 1;
    return;
  }

  db.prepare(`
    UPDATE mindmap_edges
    SET source = @source,
        target = @target,
        label = @label
    WHERE conversation_id = @conversation_id AND id = @id
  `).run({
    id,
    conversation_id: conversationId,
    source,
    target,
    label: edge.label === undefined ? existing.label : asString(edge.label)
  });
  applied.updatedEdges += 1;
}

function removeByIds(db, table, conversationId, ids) {
  const validIds = (Array.isArray(ids) ? ids : [])
    .map(asString)
    .filter(Boolean);

  if (validIds.length === 0) {
    return 0;
  }

  const statement = db.prepare(`
    DELETE FROM ${table}
    WHERE conversation_id = ? AND id = ?
  `);
  let removed = 0;

  for (const id of validIds) {
    removed += statement.run(conversationId, id).changes;
  }

  return removed;
}

export function applyMindmapPatch({ conversationId, patch }) {
  const db = getDatabase();
  const normalizedPatch = normalizePatch(patch);
  const applied = {
    addedNodes: 0,
    updatedNodes: 0,
    removedNodes: 0,
    skippedNodes: 0,
    addedEdges: 0,
    updatedEdges: 0,
    removedEdges: 0,
    skippedEdges: 0
  };

  const applyPatch = db.transaction(() => {
    applied.removedEdges += removeByIds(db, 'mindmap_edges', conversationId, normalizedPatch.removeEdges);
    applied.removedNodes += removeByIds(db, 'mindmap_nodes', conversationId, normalizedPatch.removeNodes);

    const basePositionIndex = getNodeCount(db, conversationId);
    for (const [index, node] of (normalizedPatch.addNodes || []).entries()) {
      applyAddNode(db, conversationId, node, basePositionIndex + index, applied);
    }

    for (const node of normalizedPatch.updateNodes || []) {
      applyUpdateNode(db, conversationId, node, applied);
    }

    for (const edge of normalizedPatch.addEdges || []) {
      applyAddEdge(db, conversationId, edge, applied);
    }

    for (const edge of normalizedPatch.updateEdges || []) {
      applyUpdateEdge(db, conversationId, edge, applied);
    }

    db.prepare(`
      UPDATE conversations
      SET updated_at = datetime('now')
      WHERE id = ?
    `).run(conversationId);
  });

  applyPatch();

  return {
    mindmap: getMindmap(conversationId),
    applied
  };
}
