import { Router } from 'express';
import { getConversation, getMindmap } from '../services/conversationService.js';

const router = Router();

router.get('/:conversationId', (req, res) => {
  const conversation = getConversation(req.params.conversationId);
  if (!conversation) {
    return res.status(404).json({
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.'
      }
    });
  }

  return res.json({
    conversationId: conversation.id,
    mindmap: getMindmap(conversation.id)
  });
});

router.post('/node-question', (req, res) => {
  const { conversationId, nodeId, question } = req.body;
  if (!conversationId || !nodeId || !question) {
    return res.status(400).json({
      error: {
        code: 'INVALID_NODE_QUESTION_REQUEST',
        message: 'conversationId, nodeId, and question are required.'
      }
    });
  }

  return res.status(501).json({
    error: {
      code: 'NODE_QUESTION_NOT_IMPLEMENTED',
      message: 'Node follow-up questions will be implemented after AI routing and mind map patches are available.'
    }
  });
});

export default router;
