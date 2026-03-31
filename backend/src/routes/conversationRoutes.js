import { Router } from 'express';
import {
  createConversation,
  getConversationSnapshot,
  listConversations,
  deleteConversation
} from '../services/conversationService.js';
import { buildConversationExport } from '../services/conversationExportService.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    conversations: listConversations()
  });
});

router.post('/', (req, res) => {
  const conversation = createConversation({
    provider: req.body.provider || 'ollama',
    model: req.body.model || 'gemma3:1b',
    title: req.body.title || 'New chat'
  });

  res.status(201).json({ conversation });
});

router.get('/:conversationId/export', (req, res) => {
  const payload = buildConversationExport(
    req.params.conversationId,
    String(req.query.format || 'markdown').toLowerCase()
  );

  if (!payload) {
    return res.status(404).json({
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.'
      }
    });
  }

  return res.json(payload);
});

router.get('/:conversationId', (req, res) => {
  const snapshot = getConversationSnapshot(req.params.conversationId);
  if (!snapshot) {
    return res.status(404).json({
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.'
      }
    });
  }

  return res.json(snapshot);
});

router.delete('/:conversationId', (req, res) => {
  try {
    deleteConversation(req.params.conversationId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
