import { Router } from 'express';
import {
  createMessage,
  getMindmap,
  getOrCreateConversation
} from '../services/conversationService.js';

const router = Router();

function validateChatRequest(body) {
  const errors = [];

  if (!body.provider) {
    errors.push('provider is required.');
  }

  if (!body.model) {
    errors.push('model is required.');
  }

  if (!body.message || !String(body.message).trim()) {
    errors.push('message is required.');
  }

  return errors;
}

router.post('/', (req, res, next) => {
  try {
    const validationErrors = validateChatRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CHAT_REQUEST',
          message: validationErrors.join(' ')
        }
      });
    }

    const conversation = getOrCreateConversation(req.body);
    const message = createMessage({
      conversationId: conversation.id,
      role: 'user',
      content: String(req.body.message).trim()
    });

    return res.status(501).json({
      error: {
        code: 'AI_ROUTER_NOT_IMPLEMENTED',
        message: 'The backend database is ready. AI routing will be implemented in the provider phase.'
      },
      conversation,
      message,
      agentOpinions: [],
      mindmap: getMindmap(conversation.id),
      suggestedQuestions: []
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
