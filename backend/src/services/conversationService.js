import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/database.js';

function buildTitle(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    return 'Untitled brainstorming';
  }

  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export function createConversation({ provider, model, title }) {
  const db = getDatabase();
  const conversation = {
    id: randomUUID(),
    title: title || 'Untitled brainstorming',
    provider,
    model
  };

  db.prepare(`
    INSERT INTO conversations (id, title, provider, model)
    VALUES (@id, @title, @provider, @model)
  `).run(conversation);

  return getConversation(conversation.id);
}

export function getConversation(conversationId) {
  return getDatabase()
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(conversationId);
}

export function getOrCreateConversation({ conversationId, provider, model, message }) {
  if (conversationId) {
    const existing = getConversation(conversationId);
    if (!existing) {
      const error = new Error('Conversation not found.');
      error.statusCode = 404;
      throw error;
    }

    return existing;
  }

  return createConversation({
    provider,
    model,
    title: buildTitle(message)
  });
}

export function createMessage({ conversationId, role, content }) {
  const db = getDatabase();
  const message = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content
  };

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (@id, @conversation_id, @role, @content)
  `).run(message);

  db.prepare(`
    UPDATE conversations
    SET updated_at = datetime('now')
    WHERE id = ?
  `).run(conversationId);

  return getMessage(message.id);
}

export function getMessage(messageId) {
  return getDatabase()
    .prepare('SELECT * FROM messages WHERE id = ?')
    .get(messageId);
}

export function listMessages(conversationId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)
    .all(conversationId);
}

export function listConversations() {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM conversations
      ORDER BY updated_at DESC
    `)
    .all();
}

export function getMindmap(conversationId) {
  const db = getDatabase();
  const nodes = db.prepare(`
    SELECT *
    FROM mindmap_nodes
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId);

  const edges = db.prepare(`
    SELECT *
    FROM mindmap_edges
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId);

  return { nodes, edges };
}
