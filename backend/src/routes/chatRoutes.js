import { Router } from 'express';
import {
  createAgentOpinions,
  createMessage,
  getMindmap,
  getOrCreateConversation,
  listMessages
} from '../services/conversationService.js';
import {
  generateBrainstormResponse,
  validateProviderRequest
} from '../services/aiRouterService.js';
import { applyMindmapPatch } from '../services/mindmapPatchService.js';

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

router.post('/', async (req, res, next) => {
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

    const providerMetadata = validateProviderRequest(req.body);
    const conversation = getOrCreateConversation(req.body);
    const message = createMessage({
      conversationId: conversation.id,
      role: 'user',
      content: String(req.body.message).trim()
    });
    const mindmap = getMindmap(conversation.id);

    try {
      const aiResponse = await generateBrainstormResponse({
        provider: req.body.provider,
        model: req.body.model,
        message: req.body.message,
        conversation,
        history: listMessages(conversation.id),
        mindmap
      });
      const assistantMessage = createMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.chatResponse
      });
      createAgentOpinions({
        messageId: assistantMessage.id,
        opinions: aiResponse.agentOpinions
      });
      const patchResult = applyMindmapPatch({
        conversationId: conversation.id,
        patch: aiResponse.mindmapPatch
      });

      return res.json({
        conversation,
        message: assistantMessage,
        provider: providerMetadata,
        chatResponse: aiResponse.chatResponse,
        agentOpinions: aiResponse.agentOpinions,
        mindmap: patchResult.mindmap,
        mindmapPatch: aiResponse.mindmapPatch,
        suggestedQuestions: aiResponse.suggestedQuestions,
        metadata: {
          ...aiResponse.metadata,
          patchApplied: patchResult.applied
        }
      });
    } catch (providerError) {
      return res.status(providerError.statusCode || 500).json({
        error: {
          code: providerError.code || 'AI_PROVIDER_ERROR',
          message: providerError.message,
          details: providerError.details
        },
        conversation,
        message,
        provider: providerMetadata,
        agentOpinions: [],
        mindmap,
        suggestedQuestions: []
      });
    }
  } catch (error) {
    return next(error);
  }
});

export default router;
