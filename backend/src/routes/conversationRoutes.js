import { Router } from 'express';
import {
  createConversation,
  getConversationSnapshot,
  listConversations
} from '../services/conversationService.js';

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

export default router;
