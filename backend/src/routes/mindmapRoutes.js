import { Router } from 'express';
import {
  createAgentOpinions,
  createMessage,
  getConversation,
  getMindmap,
  getMindmapNode,
  listMessages
} from '../services/conversationService.js';
import {
  generateBrainstormResponse,
  validateProviderRequest
} from '../services/aiRouterService.js';
import {
  applyMindmapPatch,
  ensureRootMindmapNode
} from '../services/mindmapPatchService.js';
import { MINDMAP_NODE_TYPES } from '../providers/baseProvider.js';

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

router.patch('/:conversationId/nodes/:nodeId', (req, res) => {
  const { conversationId, nodeId } = req.params;
  const conversation = getConversation(conversationId);
  if (!conversation) {
    return res.status(404).json({
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.'
      }
    });
  }

  const existingNode = getMindmapNode(conversation.id, nodeId);
  if (!existingNode) {
    return res.status(404).json({
      error: {
        code: 'MINDMAP_NODE_NOT_FOUND',
        message: 'Mind map node not found.'
      }
    });
  }

  const label = String(req.body?.label || '').trim();
  const type = String(req.body?.type || existingNode.type).trim();
  const description = String(req.body?.description || '').trim();
  const parentId = req.body?.parentId === '' ? null : req.body?.parentId ?? existingNode.parent_id;

  if (!label) {
    return res.status(400).json({
      error: {
        code: 'INVALID_MINDMAP_NODE',
        message: 'label is required.'
      }
    });
  }

  if (!MINDMAP_NODE_TYPES.includes(type)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_MINDMAP_NODE_TYPE',
        message: `type must be one of ${MINDMAP_NODE_TYPES.join(', ')}.`
      }
    });
  }

  if (parentId && !getMindmapNode(conversation.id, parentId)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_MINDMAP_NODE_PARENT',
        message: 'parentId must point to an existing node in the conversation.'
      }
    });
  }

  const patchResult = applyMindmapPatch({
    conversationId: conversation.id,
    patch: {
      updateNodes: [{
        id: existingNode.id,
        label,
        type,
        parentId,
        description
      }]
    }
  });
  const node = getMindmapNode(conversation.id, existingNode.id);

  return res.json({
    conversation,
    node,
    mindmap: patchResult.mindmap,
    metadata: {
      patchApplied: patchResult.applied
    }
  });
});

router.post('/node-question', async (req, res, next) => {
  try {
    const { conversationId, nodeId, question } = req.body;
    const trimmedQuestion = String(question || '').trim();

    if (!conversationId || !nodeId || !trimmedQuestion) {
      return res.status(400).json({
        error: {
          code: 'INVALID_NODE_QUESTION_REQUEST',
          message: 'conversationId, nodeId, and question are required.'
        }
      });
    }

    const conversation = getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found.'
        }
      });
    }

    const selectedNode = getMindmapNode(conversation.id, nodeId);
    if (!selectedNode) {
      return res.status(404).json({
        error: {
          code: 'MINDMAP_NODE_NOT_FOUND',
          message: 'Mind map node not found.'
        }
      });
    }

    const providerMetadata = validateProviderRequest({
      provider: conversation.provider,
      model: conversation.model
    });
    const userMessage = createMessage({
      conversationId: conversation.id,
      role: 'user',
      content: `[${selectedNode.label}] ${trimmedQuestion}`
    });
    ensureRootMindmapNode({
      conversationId: conversation.id,
      label: conversation.title,
      description: conversation.title
    });
    const mindmap = getMindmap(conversation.id);

    try {
      const aiResponse = await generateBrainstormResponse({
        provider: conversation.provider,
        model: conversation.model,
        message: trimmedQuestion,
        conversation,
        history: listMessages(conversation.id),
        mindmap,
        nodeContext: selectedNode
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
        selectedNode,
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
        message: userMessage,
        provider: providerMetadata,
        agentOpinions: [],
        mindmap,
        suggestedQuestions: [],
        selectedNode
      });
    }
  } catch (error) {
    return next(error);
  }
});

export default router;
