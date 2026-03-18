import {
  MINDMAP_NODE_TYPES,
  REQUIRED_AGENT_ROLES
} from '../providers/baseProvider.js';

const PATCH_KEYS = [
  'addNodes',
  'updateNodes',
  'removeNodes',
  'addEdges',
  'updateEdges',
  'removeEdges'
];

function truncateText(value, maxLength = 1200) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactHistory(history) {
  return history
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: truncateText(message.content, 600)
    }));
}

function compactMindmap(mindmap) {
  const nodes = mindmap.nodes || [];
  const rootNode = nodes.find((node) => !(node.parent_id || node.parentId)) || nodes[0] || null;

  return {
    rootNodeId: rootNode?.id || null,
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      parentId: node.parent_id || node.parentId || null,
      description: truncateText(node.description, 300)
    })),
    edges: (mindmap.edges || []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || ''
    }))
  };
}

function compactNodeContext(nodeContext) {
  if (!nodeContext) {
    return null;
  }

  return {
    id: nodeContext.id,
    label: nodeContext.label,
    type: nodeContext.type,
    parentId: nodeContext.parent_id || nodeContext.parentId || null,
    description: truncateText(nodeContext.description, 600)
  };
}

export function buildBrainstormPrompt({
  message,
  history = [],
  mindmap = { nodes: [], edges: [] },
  nodeContext = null
}) {
  const promptContext = {
    userMessage: truncateText(message, 4000),
    recentConversation: compactHistory(history),
    currentMindmap: compactMindmap(mindmap),
    selectedNode: compactNodeContext(nodeContext)
  };
  const lockedTopic = promptContext.currentMindmap.rootNodeId
    ? promptContext.currentMindmap.nodes.find((node) => node.id === promptContext.currentMindmap.rootNodeId)?.label
    : promptContext.userMessage;

  return `
You are a role-based AI brainstorming workspace engine.

Critical topic lock:
- The central topic is exactly: "${lockedTopic || promptContext.userMessage}".
- The latest user request is: "${promptContext.userMessage}".
- Do not switch to another domain, industry, product, or example topic.
- Every chatResponse sentence, agent opinion, mindmap node, and edge must be directly relevant to that central topic.
- If you are unsure, create a "question" node asking for clarification instead of inventing an unrelated topic.

Process the user's input as a collaborative brainstorming session with these exact Korean roles:
${REQUIRED_AGENT_ROLES.map((role) => `- ${role}`).join('\n')}

Rules:
1. Return JSON only. Do not wrap it in markdown. Do not add commentary outside JSON.
2. Always generate one opinion for every required role.
3. Always generate a mindmapPatch object, even if every patch array is empty.
4. Use the existing mind map to avoid duplicate nodes. Prefer updateNodes when a concept already exists.
5. Use patch updates only. Do not regenerate the whole mind map.
6. Keep node ids stable, lowercase, and readable when possible.
7. Node type must be one of: ${MINDMAP_NODE_TYPES.join(', ')}.
8. If selectedNode exists, answer the question in the context of that node and update or extend that node when useful.
9. The first/root node is the central topic. Never create a separate unrelated root. Every new node must connect to the root node or to an existing descendant through parentId and addEdges.
10. Do not draw random lateral chains. Use a clear hierarchy: central topic -> category -> detail/task/risk/decision/question.
11. Write chatResponse, opinions, node labels, descriptions, and suggestedQuestions in Korean.

Required JSON shape:
{
  "chatResponse": "채팅창에 표시할 답변",
  "agentOpinions": [
    { "role": "아이디어 뱅크", "opinion": "새로운 아이디어 제안" },
    { "role": "비판가", "opinion": "위험 요소와 한계 지적" },
    { "role": "검토자", "opinion": "현실성 및 우선순위 검토" },
    { "role": "구현 설계자", "opinion": "DB/API/UI 구현 관점 정리" },
    { "role": "정리자", "opinion": "최종 결론 요약" }
  ],
  "mindmapPatch": {
    "addNodes": [
      {
        "id": "unique-node-id",
        "label": "노드명",
        "type": "idea | risk | feature | task | decision | question",
        "parentId": "parent-node-id or null",
        "description": "노드 설명"
      }
    ],
    "updateNodes": [],
    "removeNodes": [],
    "addEdges": [
      {
        "id": "edge-id",
        "source": "parent-node-id",
        "target": "child-node-id",
        "label": "관계"
      }
    ],
    "updateEdges": [],
    "removeEdges": []
  },
  "suggestedQuestions": [
    "이 기능을 MVP로 줄이면?",
    "DB 설계는 어떻게 하면 좋을까?"
  ]
}

Context:
${JSON.stringify(promptContext, null, 2)}
`.trim();
}

function stripJsonCodeFence(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function extractJsonObject(text) {
  const unfenced = stripJsonCodeFence(text);
  const firstBrace = unfenced.indexOf('{');
  const lastBrace = unfenced.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found.');
  }

  return unfenced.slice(firstBrace, lastBrace + 1);
}

function asString(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

function normalizeAgentOpinions(agentOpinions) {
  const source = Array.isArray(agentOpinions) ? agentOpinions : [];
  const byRole = new Map();

  for (const item of source) {
    const role = asString(item?.role);
    const opinion = asString(item?.opinion);
    if (role && opinion) {
      byRole.set(role, { role, opinion });
    }
  }

  return REQUIRED_AGENT_ROLES.map((role, index) => {
    const exact = byRole.get(role);
    if (exact) {
      return exact;
    }

    const positionalOpinion = asString(source[index]?.opinion);
    return {
      role,
      opinion: positionalOpinion || '응답에서 이 역할의 의견이 누락되었습니다.'
    };
  });
}

function normalizeNode(node) {
  const type = MINDMAP_NODE_TYPES.includes(node?.type) ? node.type : 'idea';

  return {
    id: asString(node?.id),
    label: asString(node?.label),
    type,
    parentId: node?.parentId === undefined ? null : node.parentId,
    description: asString(node?.description)
  };
}

function normalizeNodeUpdate(node) {
  return {
    id: asString(node?.id),
    label: node?.label === undefined ? undefined : asString(node.label),
    type: node?.type === undefined
      ? undefined
      : (MINDMAP_NODE_TYPES.includes(node.type) ? node.type : 'idea'),
    parentId: node?.parentId === undefined ? undefined : node.parentId,
    description: node?.description === undefined ? undefined : asString(node.description)
  };
}

function normalizeEdge(edge) {
  return {
    id: asString(edge?.id),
    source: asString(edge?.source),
    target: asString(edge?.target),
    label: asString(edge?.label)
  };
}

function normalizeEdgeUpdate(edge) {
  return {
    id: asString(edge?.id),
    source: edge?.source === undefined ? undefined : asString(edge.source),
    target: edge?.target === undefined ? undefined : asString(edge.target),
    label: edge?.label === undefined ? undefined : asString(edge.label)
  };
}

function normalizeRemoveItem(item) {
  if (typeof item === 'string') {
    return item.trim();
  }

  return asString(item?.id);
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeMindmapPatch(patch) {
  const normalized = Object.fromEntries(PATCH_KEYS.map((key) => [key, []]));
  const source = patch && typeof patch === 'object' ? patch : {};

  normalized.addNodes = cleanArray(source.addNodes)
    .map(normalizeNode)
    .filter((node) => node.id && node.label);

  normalized.updateNodes = cleanArray(source.updateNodes)
    .map(normalizeNodeUpdate)
    .filter((node) => node.id);

  normalized.removeNodes = cleanArray(source.removeNodes)
    .map(normalizeRemoveItem)
    .filter(Boolean);

  normalized.addEdges = cleanArray(source.addEdges)
    .map(normalizeEdge)
    .filter((edge) => edge.id && edge.source && edge.target);

  normalized.updateEdges = cleanArray(source.updateEdges)
    .map(normalizeEdgeUpdate)
    .filter((edge) => edge.id);

  normalized.removeEdges = cleanArray(source.removeEdges)
    .map(normalizeRemoveItem)
    .filter(Boolean);

  return normalized;
}

function normalizeSuggestedQuestions(questions) {
  return cleanArray(questions)
    .map((question) => asString(question))
    .filter(Boolean)
    .slice(0, 5);
}

function fallbackResponse(rawText, error) {
  const text = truncateText(rawText, 3000) || 'AI 응답을 JSON으로 파싱하지 못했습니다.';

  return {
    chatResponse: text,
    agentOpinions: REQUIRED_AGENT_ROLES.map((role) => ({
      role,
      opinion: role === '정리자'
        ? text
        : 'JSON 파싱 실패로 원문에서 역할별 의견을 분리하지 못했습니다.'
    })),
    mindmapPatch: normalizeMindmapPatch({}),
    suggestedQuestions: [
      '이 응답을 올바른 JSON으로 다시 정리해줘',
      '마인드맵에 추가할 핵심 노드는 무엇일까?'
    ],
    metadata: {
      normalizedBy: 'fallback',
      parseError: error.message
    }
  };
}

export function normalizeAiJsonResponse(rawText) {
  try {
    const jsonText = extractJsonObject(rawText);
    const parsed = JSON.parse(jsonText);
    const chatResponse = asString(parsed.chatResponse);

    return {
      chatResponse: chatResponse || '응답에 chatResponse가 없어 기본 응답으로 대체했습니다.',
      agentOpinions: normalizeAgentOpinions(parsed.agentOpinions),
      mindmapPatch: normalizeMindmapPatch(parsed.mindmapPatch),
      suggestedQuestions: normalizeSuggestedQuestions(parsed.suggestedQuestions),
      metadata: {
        normalizedBy: 'json'
      }
    };
  } catch (error) {
    return fallbackResponse(rawText, error);
  }
}
