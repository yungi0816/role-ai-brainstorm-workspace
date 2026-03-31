import { getConversationSnapshot } from './conversationService.js';

function escapeMarkdownTable(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function asDateText(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || fallback;
}

function roleLabel(role) {
  return role === 'user' ? 'User' : 'Assistant';
}

function formatMessage(message, index) {
  const lines = [
    `### ${index + 1}. ${roleLabel(message.role)}`,
    '',
    message.content || ''
  ];

  if (message.agentOpinions?.length) {
    lines.push('', 'Role opinions:', '');
    for (const opinion of message.agentOpinions) {
      lines.push(`- **${opinion.role}**: ${opinion.opinion}`);
    }
  }

  return lines.join('\n');
}

function formatMindmapNodes(nodes) {
  if (!nodes.length) {
    return '_No mind map nodes saved._';
  }

  return [
    '| Label | Type | Parent | Description |',
    '| --- | --- | --- | --- |',
    ...nodes.map((node) => (
      `| ${escapeMarkdownTable(node.label)} | ${escapeMarkdownTable(node.type)} | ${escapeMarkdownTable(node.parent_id || '')} | ${escapeMarkdownTable(node.description)} |`
    ))
  ].join('\n');
}

function formatMindmapEdges(edges, nodeLabels) {
  if (!edges.length) {
    return '_No mind map edges saved._';
  }

  return [
    '| Source | Target | Label |',
    '| --- | --- | --- |',
    ...edges.map((edge) => (
      `| ${escapeMarkdownTable(nodeLabels.get(edge.source) || edge.source)} | ${escapeMarkdownTable(nodeLabels.get(edge.target) || edge.target)} | ${escapeMarkdownTable(edge.label)} |`
    ))
  ].join('\n');
}

function toExportSnapshot(snapshot) {
  return {
    exportedAt: new Date().toISOString(),
    conversation: snapshot.conversation,
    messages: snapshot.messages,
    mindmap: snapshot.mindmap
  };
}

function toMarkdown(snapshot) {
  const { conversation, messages, mindmap } = snapshot;
  const nodeLabels = new Map((mindmap.nodes || []).map((node) => [node.id, node.label]));

  return [
    `# ${conversation.title}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Provider | ${escapeMarkdownTable(conversation.provider)} |`,
    `| Model | ${escapeMarkdownTable(conversation.model)} |`,
    `| Created | ${escapeMarkdownTable(asDateText(conversation.created_at))} |`,
    `| Updated | ${escapeMarkdownTable(asDateText(conversation.updated_at))} |`,
    `| Exported | ${escapeMarkdownTable(new Date().toISOString())} |`,
    '',
    '## Conversation',
    '',
    ...(messages.length ? messages.map(formatMessage) : ['_No messages saved._']),
    '',
    '## Mind Map Nodes',
    '',
    formatMindmapNodes(mindmap.nodes || []),
    '',
    '## Mind Map Edges',
    '',
    formatMindmapEdges(mindmap.edges || [], nodeLabels),
    ''
  ].join('\n');
}

export function buildConversationExport(conversationId, requestedFormat = 'markdown') {
  const snapshot = getConversationSnapshot(conversationId);
  if (!snapshot) {
    return null;
  }

  const format = requestedFormat === 'json' ? 'json' : 'markdown';
  const baseName = slugify(snapshot.conversation.title, `conversation-${snapshot.conversation.id}`);

  if (format === 'json') {
    return {
      format,
      filename: `${baseName}.json`,
      content: toExportSnapshot(snapshot)
    };
  }

  return {
    format,
    filename: `${baseName}.md`,
    content: toMarkdown(snapshot)
  };
}
