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

const PATCH_LIMITS = {
  addNodes: 12,
  updateNodes: 12,
  removeNodes: 8,
  addEdges: 16,
  updateEdges: 12,
  removeEdges: 8
};

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
  const rootNode = promptContext.currentMindmap.nodes.find((n) => n.id === promptContext.currentMindmap.rootNodeId);
  const currentTopic = rootNode?.label || promptContext.userMessage;

  return `
당신은 사용자의 질문에 대해 즉시 실무적이고 날카로운 통찰을 제공하는 1인칭 전문 컨설턴트입니다.
**경고: 사용자의 질문 주제에서 단 1%도 벗어나지 마십시오.**
현재 질문 주제: "${promptContext.userMessage}"

이 주제에 대해 다음 4개 항목을 반드시 포함하여 당신의 확고한 견해를 답변하십시오. 추상적인 단어([현황], [문제] 등)로 답변을 채우지 말고, 구체적인 사실과 통찰을 적으십시오.

[chatResponse 필수 구성 요소 - 반드시 이 순서로 실제 내용을 적으세요]
1. [견해]: "${promptContext.userMessage}"에 대한 당신의 주관적이고 확고한 전문가적 평가
2. [한계]: 현재 이 분야나 시스템이 가진 치명적인 실무적 한계와 문제점
3. [발전]: 향후 어떤 기술이나 정책이 도입되어야 혁신적인 발전이 가능할지에 대한 구체적 제언
4. [선호도]: 실제 현장 실무자들이 가장 목말라하는 기능이나 실질적인 요구사항

수행 규칙:
- "분석을 시작합니다" 같은 서론은 절대 하지 마세요. 바로 본론으로 들어갑니다.
- agentOpinions 배열에는 반드시 5명의 전문가(아이디어 뱅크, 비판가, 검토자, 구현 설계자, 정리자)의 의견을 각각 구체적으로 포함하세요. 의견이 누락되지 않도록 주의하십시오.
- **가독성 극대화**: 모든 답변(chatResponse 및 opinion)에는 마크다운(Markdown) 문법을 적극적으로 사용하십시오. 핵심 키워드는 **굵은 글씨('**텍스트**')**로 강조하고, 여러 항목을 나열할 때는 **불릿 리스트('- 항목')**를 사용하며, 내용이 전환될 때는 **줄바꿈('\\n\\n')**으로 문단을 명확히 나누십시오.
- 반드시 순수한 JSON 객체만 반환하세요.
- 모든 답변은 한국어로 작성하세요.

필수 JSON 구조:
{
  "chatResponse": "**[견해]**: 나는 이 주제에 대해 **...**라고 생각합니다.\\n\\n**[한계]**: 현재는 다음과 같은 부분이 부족합니다.\\n- 한계점 1\\n- 한계점 2\\n\\n**[발전]**: 앞으로 **...방향**으로 가야 합니다.\\n\\n**[선호도]**: 실제 사용자들은 ...를 훨씬 선호할 것입니다.",
  "agentOpinions": [
    { "role": "아이디어 뱅크", "opinion": "구체적 제안은 다음과 같습니다:\\n\\n- **제안 1**: 설명...\\n- **제안 2**: 설명..." },
    { "role": "비판가", "opinion": "**가장 큰 리스크**는 ...입니다.\\n\\n- **비판 1**: 설명...\\n- **비판 2**: 설명..." },
    { "role": "검토자", "opinion": "정책적 검토 내용..." },
    { "role": "구현 설계자", "opinion": "기술적 구현 방안..." },
    { "role": "정리자", "opinion": "핵심 요약 및 실행 로드맵..." }
  ],
  "mindmapPatch": {
    "addNodes": [
      { "id": "insight-1", "label": "실무 핵심 통찰", "type": "idea", "parentId": "${promptContext.currentMindmap.rootNodeId}" }
    ],
    "updateNodes": [
      { "id": "${promptContext.currentMindmap.rootNodeId}", "label": "${currentTopic}" }
    ]
  },
  "suggestedQuestions": ["실제 현장 실무자의 가장 큰 불만은?", "이 시스템의 법적 신뢰성을 높일 방법은?"]
}

현재 컨텍스트 데이터:
${JSON.stringify(promptContext, null, 2)}
`.trim();
}

export function buildJsonRepairPrompt({ rawText, parseError }) {
  return `
아래 AI 응답을 반드시 유효한 JSON 객체 하나로만 복구하십시오.
설명, 코드블록, 마크다운 fence 없이 JSON만 반환하십시오.

필수 최상위 키:
- chatResponse: string
- agentOpinions: array, 반드시 5개 역할 포함: ${REQUIRED_AGENT_ROLES.join(', ')}
- mindmapPatch: object, addNodes/updateNodes/removeNodes/addEdges/updateEdges/removeEdges 배열 포함
- suggestedQuestions: string array

mindmapPatch 노드 type은 다음 중 하나만 사용하십시오: ${MINDMAP_NODE_TYPES.join(', ')}
복구할 수 없는 mindmapPatch 항목은 빈 배열로 두십시오.

파싱 오류:
${truncateText(parseError, 800)}

복구 대상 원문:
${truncateText(rawText, 8000)}
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

function asBoundedString(value, maxLength, fallback = '') {
  return truncateText(asString(value, fallback), maxLength);
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
    id: asBoundedString(node?.id, 96),
    label: asBoundedString(node?.label, 80),
    type,
    parentId: node?.parentId === undefined ? null : asBoundedString(node.parentId, 96),
    description: asBoundedString(node?.description, 500)
  };
}

function normalizeNodeUpdate(node) {
  return {
    id: asBoundedString(node?.id, 96),
    label: node?.label === undefined ? undefined : asBoundedString(node.label, 80),
    type: node?.type === undefined
      ? undefined
      : (MINDMAP_NODE_TYPES.includes(node.type) ? node.type : 'idea'),
    parentId: node?.parentId === undefined ? undefined : asBoundedString(node.parentId, 96),
    description: node?.description === undefined ? undefined : asBoundedString(node.description, 500)
  };
}

function normalizeEdge(edge) {
  return {
    id: asBoundedString(edge?.id, 120),
    source: asBoundedString(edge?.source, 96),
    target: asBoundedString(edge?.target, 96),
    label: asBoundedString(edge?.label, 80)
  };
}

function normalizeEdgeUpdate(edge) {
  return {
    id: asBoundedString(edge?.id, 120),
    source: edge?.source === undefined ? undefined : asBoundedString(edge.source, 96),
    target: edge?.target === undefined ? undefined : asBoundedString(edge.target, 96),
    label: edge?.label === undefined ? undefined : asBoundedString(edge.label, 80)
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

function uniqueBy(items, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeMindmapPatch(patch) {
  const normalized = Object.fromEntries(PATCH_KEYS.map((key) => [key, []]));
  const source = patch && typeof patch === 'object' ? patch : {};

  normalized.addNodes = uniqueBy(cleanArray(source.addNodes)
    .map(normalizeNode)
    .filter((node) => node.id && node.label), (node) => node.id)
    .slice(0, PATCH_LIMITS.addNodes);

  normalized.updateNodes = uniqueBy(cleanArray(source.updateNodes)
    .map(normalizeNodeUpdate)
    .filter((node) => node.id), (node) => node.id)
    .slice(0, PATCH_LIMITS.updateNodes);

  normalized.removeNodes = uniqueBy(cleanArray(source.removeNodes)
    .map(normalizeRemoveItem)
    .filter(Boolean), (id) => id)
    .slice(0, PATCH_LIMITS.removeNodes);

  normalized.addEdges = uniqueBy(cleanArray(source.addEdges)
    .map(normalizeEdge)
    .filter((edge) => edge.id && edge.source && edge.target), (edge) => `${edge.source}->${edge.target}`)
    .slice(0, PATCH_LIMITS.addEdges);

  normalized.updateEdges = uniqueBy(cleanArray(source.updateEdges)
    .map(normalizeEdgeUpdate)
    .filter((edge) => edge.id), (edge) => edge.id)
    .slice(0, PATCH_LIMITS.updateEdges);

  normalized.removeEdges = uniqueBy(cleanArray(source.removeEdges)
    .map(normalizeRemoveItem)
    .filter(Boolean), (id) => id)
    .slice(0, PATCH_LIMITS.removeEdges);

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
