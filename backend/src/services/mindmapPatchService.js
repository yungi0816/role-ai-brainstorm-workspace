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

function normalizeLabelKey(label) {
  return asString(label)
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, ' ');
}

function getNode(db, id) {
  return db.prepare('SELECT * FROM mindmap_nodes WHERE id = ?').get(id);
}

function findNodeByLabel(db, conversationId, label, excludeId = null) {
  const key = normalizeLabelKey(label);
  if (!key) {
    return null;
  }

  const nodes = db.prepare(`
    SELECT *
    FROM mindmap_nodes
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId);

  return nodes.find((node) => node.id !== excludeId && normalizeLabelKey(node.label) === key) || null;
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

function getRootNode(db, conversationId) {
  return db.prepare(`
    SELECT *
    FROM mindmap_nodes
    WHERE conversation_id = ? AND parent_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  `).get(conversationId);
}

function getPositionForIndex(index) {
  return {
    x: (index % 4) * 240,
    y: Math.floor(index / 4) * 160
  };
}

function wouldCreateCycle(db, conversationId, nodeId, parentId) {
  if (!nodeId || !parentId) {
    return false;
  }

  let currentParentId = parentId;
  const visited = new Set();

  while (currentParentId) {
    if (currentParentId === nodeId || visited.has(currentParentId)) {
      return true;
    }

    visited.add(currentParentId);
    const currentParent = db.prepare(`
      SELECT parent_id
      FROM mindmap_nodes
      WHERE conversation_id = ? AND id = ?
    `).get(conversationId, currentParentId);

    if (!currentParent) {
      return false;
    }

    currentParentId = currentParent.parent_id;
  }

  return false;
}

function resolveParentId(db, conversationId, nodeId, requestedParentId, rootNode, applied) {
  if (rootNode && nodeId === rootNode.id) {
    return null;
  }

  let parentId = requestedParentId;

  if (parentId === nodeId) {
    parentId = rootNode?.id || null;
    applied.reparentedNodes += 1;
  }

  if (
    rootNode &&
    nodeId !== rootNode.id &&
    (!parentId || !nodeExistsInConversation(db, conversationId, parentId))
  ) {
    parentId = rootNode.id;
    applied.reparentedNodes += 1;
  }

  if (parentId && wouldCreateCycle(db, conversationId, nodeId, parentId)) {
    parentId = rootNode && nodeId !== rootNode.id ? rootNode.id : null;
    applied.reparentedNodes += 1;
  }

  return parentId;
}

export function ensureRootMindmapNode({ conversationId, label, description = '' }) {
  const db = getDatabase();
  const existingRoot = getRootNode(db, conversationId);
  if (existingRoot) {
    return existingRoot;
  }

  const root = {
    id: `topic-${conversationId}`,
    conversation_id: conversationId,
    label: asString(label) || '새 브레인스토밍',
    type: 'idea',
    parent_id: null,
    description: asString(description),
    x: 0,
    y: 0
  };

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
  `).run(root);

  return getNode(db, root.id);
}

function applyAddNode(db, conversationId, node, positionIndex, applied, nodeAliases) {
  const requestedId = asString(node.id);
  const id = nodeAliases.get(requestedId) || requestedId;
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

  const duplicate = existing ? null : findNodeByLabel(db, conversationId, label, id);
  const targetNode = existing || duplicate;
  if (duplicate) {
    nodeAliases.set(requestedId, duplicate.id);
    applied.dedupedNodes += 1;
  }

  const position = getPositionForIndex(positionIndex);
  const rootNode = getRootNode(db, conversationId);
  const targetId = targetNode?.id || id;
  const requestedParentId = node.parentId === undefined
    ? targetNode?.parent_id || null
    : nodeAliases.get(asNullableString(node.parentId)) || asNullableString(node.parentId);
  const parentId = resolveParentId(db, conversationId, targetId, requestedParentId, rootNode, applied);

  const payload = {
    id: targetId,
    conversation_id: conversationId,
    label,
    type: node.type === undefined && targetNode ? targetNode.type : asNodeType(node.type),
    parent_id: parentId,
    description: node.description === undefined && targetNode ? targetNode.description : asString(node.description),
    x: node.x === undefined && targetNode ? targetNode.x : asNumber(node.x, position.x),
    y: node.y === undefined && targetNode ? targetNode.y : asNumber(node.y, position.y)
  };

  if (targetNode) {
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

function applyUpdateNode(db, conversationId, node, applied, nodeAliases) {
  const requestedId = asString(node.id);
  const id = nodeAliases.get(requestedId) || requestedId;
  if (!id || !nodeExistsInConversation(db, conversationId, id)) {
    applied.skippedNodes += 1;
    return;
  }

  const existing = getNode(db, id);
  const rootNode = getRootNode(db, conversationId);
  const requestedParentId = node.parentId === undefined
    ? existing.parent_id
    : nodeAliases.get(asNullableString(node.parentId)) || asNullableString(node.parentId);
  const parentId = resolveParentId(db, conversationId, id, requestedParentId, rootNode, applied);

  const payload = {
    id,
    conversation_id: conversationId,
    label: asString(node.label) || existing.label,
    type: node.type ? asNodeType(node.type) : existing.type,
    parent_id: parentId,
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

function edgePairExists(db, conversationId, source, target) {
  return Boolean(
    getEdgeByPair(db, conversationId, source, target)
  );
}

function getEdgeByPair(db, conversationId, source, target) {
  return (
    db.prepare(`
      SELECT *
      FROM mindmap_edges
      WHERE conversation_id = ? AND source = ? AND target = ?
      ORDER BY created_at ASC
      LIMIT 1
    `).get(conversationId, source, target)
  );
}

function edgeMatchesParent(db, conversationId, source, target) {
  const targetNode = getNode(db, target);
  return Boolean(
    targetNode &&
    targetNode.conversation_id === conversationId &&
    targetNode.parent_id === source
  );
}

function ensureParentEdges(db, conversationId) {
  const nodes = db.prepare(`
    SELECT id, parent_id
    FROM mindmap_nodes
    WHERE conversation_id = ? AND parent_id IS NOT NULL
    ORDER BY created_at ASC
  `).all(conversationId);
  const insertEdge = db.prepare(`
    INSERT INTO mindmap_edges (id, conversation_id, source, target, label)
    VALUES (@id, @conversation_id, @source, @target, @label)
  `);
  let inserted = 0;

  for (const node of nodes) {
    const edgeId = `edge-${conversationId}-${node.parent_id}-${node.id}`;

    if (
      node.parent_id === node.id ||
      !nodeExistsInConversation(db, conversationId, node.parent_id) ||
      edgePairExists(db, conversationId, node.parent_id, node.id) ||
      edgeExistsInConversation(db, conversationId, edgeId)
    ) {
      continue;
    }

    insertEdge.run({
      id: edgeId,
      conversation_id: conversationId,
      source: node.parent_id,
      target: node.id,
      label: '연결'
    });
    inserted += 1;
  }

  return inserted;
}

function repairInvalidParents(db, conversationId, rootNode, applied) {
  if (!rootNode) {
    return;
  }

  const nodes = db.prepare(`
    SELECT id, parent_id
    FROM mindmap_nodes
    WHERE conversation_id = ? AND id != ? AND parent_id IS NOT NULL
    ORDER BY created_at ASC
  `).all(conversationId, rootNode.id);
  const updateParent = db.prepare(`
    UPDATE mindmap_nodes
    SET parent_id = ?,
        updated_at = datetime('now')
    WHERE conversation_id = ? AND id = ?
  `);

  for (const node of nodes) {
    if (
      node.parent_id === node.id ||
      !nodeExistsInConversation(db, conversationId, node.parent_id) ||
      wouldCreateCycle(db, conversationId, node.id, node.parent_id)
    ) {
      updateParent.run(rootNode.id, conversationId, node.id);
      applied.reparentedNodes += 1;
    }
  }
}

function pruneNonTreeEdges(db, conversationId, applied) {
  const edges = db.prepare(`
    SELECT e.id, e.source, e.target, n.parent_id
    FROM mindmap_edges e
    LEFT JOIN mindmap_nodes n
      ON n.conversation_id = e.conversation_id AND n.id = e.target
    WHERE e.conversation_id = ?
  `).all(conversationId);
  const deleteEdge = db.prepare(`
    DELETE FROM mindmap_edges
    WHERE conversation_id = ? AND id = ?
  `);

  for (const edge of edges) {
    if (!edge.parent_id || edge.parent_id !== edge.source) {
      applied.removedEdges += deleteEdge.run(conversationId, edge.id).changes;
    }
  }
}

function applyAddEdge(db, conversationId, edge, applied, nodeAliases) {
  const id = asString(edge.id);
  const source = nodeAliases.get(asString(edge.source)) || asString(edge.source);
  const target = nodeAliases.get(asString(edge.target)) || asString(edge.target);

  if (
    !id ||
    !source ||
    !target ||
    source === target ||
    !nodeExistsInConversation(db, conversationId, source) ||
    !nodeExistsInConversation(db, conversationId, target)
  ) {
    applied.skippedEdges += 1;
    return;
  }

  if (!edgeMatchesParent(db, conversationId, source, target)) {
    applied.skippedEdges += 1;
    return;
  }

  const duplicatePair = getEdgeByPair(db, conversationId, source, target);
  if (duplicatePair && duplicatePair.id !== id) {
    applied.dedupedEdges += 1;
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

function applyUpdateEdge(db, conversationId, edge, applied, nodeAliases) {
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
  const requestedSource = asString(edge.source);
  const requestedTarget = asString(edge.target);
  const source = requestedSource ? nodeAliases.get(requestedSource) || requestedSource : existing.source;
  const target = requestedTarget ? nodeAliases.get(requestedTarget) || requestedTarget : existing.target;

  if (
    source === target ||
    !nodeExistsInConversation(db, conversationId, source) ||
    !nodeExistsInConversation(db, conversationId, target)
  ) {
    applied.skippedEdges += 1;
    return;
  }

  if (!edgeMatchesParent(db, conversationId, source, target)) {
    applied.skippedEdges += 1;
    return;
  }

  const duplicatePair = getEdgeByPair(db, conversationId, source, target);
  if (duplicatePair && duplicatePair.id !== id) {
    applied.dedupedEdges += 1;
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

function removeByIds(db, table, conversationId, ids, protectedIds = new Set()) {
  const validIds = (Array.isArray(ids) ? ids : [])
    .map(asString)
    .filter(Boolean);

  if (validIds.length === 0) {
    return {
      removed: 0,
      protectedSkipped: 0
    };
  }

  const statement = db.prepare(`
    DELETE FROM ${table}
    WHERE conversation_id = ? AND id = ?
  `);
  let removed = 0;
  let protectedSkipped = 0;

  for (const id of validIds) {
    if (protectedIds.has(id)) {
      protectedSkipped += 1;
      continue;
    }

    removed += statement.run(conversationId, id).changes;
  }

  return {
    removed,
    protectedSkipped
  };
}

export function applyMindmapPatch({ conversationId, patch }) {
  const db = getDatabase();
  const normalizedPatch = normalizePatch(patch);
  const applied = {
    addedNodes: 0,
    updatedNodes: 0,
    removedNodes: 0,
    skippedNodes: 0,
    dedupedNodes: 0,
    protectedNodes: 0,
    reparentedNodes: 0,
    addedEdges: 0,
    updatedEdges: 0,
    removedEdges: 0,
    skippedEdges: 0,
    dedupedEdges: 0
  };

  const applyPatch = db.transaction(() => {
    const nodeAliases = new Map();
    const existingRoot = getRootNode(db, conversationId);
    const removedEdges = removeByIds(db, 'mindmap_edges', conversationId, normalizedPatch.removeEdges);
    const removedNodes = removeByIds(
      db,
      'mindmap_nodes',
      conversationId,
      normalizedPatch.removeNodes,
      existingRoot ? new Set([existingRoot.id]) : new Set()
    );
    applied.removedEdges += removedEdges.removed;
    applied.removedNodes += removedNodes.removed;
    applied.protectedNodes += removedNodes.protectedSkipped;

    const basePositionIndex = getNodeCount(db, conversationId);
    for (const [index, node] of (normalizedPatch.addNodes || []).entries()) {
      applyAddNode(db, conversationId, node, basePositionIndex + index, applied, nodeAliases);
    }

    for (const node of normalizedPatch.updateNodes || []) {
      applyUpdateNode(db, conversationId, node, applied, nodeAliases);
    }

    for (const edge of normalizedPatch.addEdges || []) {
      applyAddEdge(db, conversationId, edge, applied, nodeAliases);
    }

    for (const edge of normalizedPatch.updateEdges || []) {
      applyUpdateEdge(db, conversationId, edge, applied, nodeAliases);
    }

    repairInvalidParents(db, conversationId, getRootNode(db, conversationId), applied);
    pruneNonTreeEdges(db, conversationId, applied);
    applied.addedEdges += ensureParentEdges(db, conversationId);

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
