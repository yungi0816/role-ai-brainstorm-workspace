import { getConversationSnapshot } from './conversationService.js';

function escapeMarkdownTable(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function htmlTable(headers, rows) {
  if (!rows.length) {
    return '<p class="empty">No data saved.</p>';
  }

  return [
    '<table>',
    '<thead>',
    `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`,
    '</thead>',
    '<tbody>',
    ...rows.map((row) => (
      `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )),
    '</tbody>',
    '</table>'
  ].join('\n');
}

function toHtml(snapshot) {
  const { conversation, messages, mindmap } = snapshot;
  const exportedAt = new Date().toISOString();
  const nodeLabels = new Map((mindmap.nodes || []).map((node) => [node.id, node.label]));
  const nodeRows = (mindmap.nodes || []).map((node) => [
    node.label,
    node.type,
    node.parent_id || '',
    node.description
  ]);
  const edgeRows = (mindmap.edges || []).map((edge) => [
    nodeLabels.get(edge.source) || edge.source,
    nodeLabels.get(edge.target) || edge.target,
    edge.label
  ]);
  const messageBlocks = messages.length
    ? messages.map((message, index) => `
      <article class="message ${escapeHtml(message.role)}">
        <h3>${index + 1}. ${escapeHtml(roleLabel(message.role))}</h3>
        <pre>${escapeHtml(message.content)}</pre>
        ${(message.agentOpinions || []).length ? `
          <div class="opinions">
            ${(message.agentOpinions || []).map((opinion) => `
              <section>
                <strong>${escapeHtml(opinion.role)}</strong>
                <p>${escapeHtml(opinion.opinion)}</p>
              </section>
            `).join('')}
          </div>
        ` : ''}
      </article>
    `).join('\n')
    : '<p class="empty">No messages saved.</p>';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    :root {
      color: #172033;
      background: #f8fafc;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      padding: 40px;
    }
    main {
      max-width: 980px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 36px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 30px;
      letter-spacing: 0;
    }
    h2 {
      margin-top: 34px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      font-size: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
    }
    .message {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin: 12px 0;
    }
    .message h3 {
      margin: 0 0 10px;
      font-size: 15px;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: inherit;
      line-height: 1.6;
    }
    .opinions {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }
    .opinions section {
      border-left: 3px solid #0891b2;
      background: #f8fafc;
      padding: 10px 12px;
    }
    .opinions p {
      margin: 6px 0 0;
      line-height: 1.55;
    }
    .meta {
      color: #475569;
      font-size: 13px;
    }
    .empty {
      color: #64748b;
      font-style: italic;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      main {
        border: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(conversation.title)}</h1>
    <p class="meta">Provider: ${escapeHtml(conversation.provider)} / ${escapeHtml(conversation.model)}</p>
    <p class="meta">Created: ${escapeHtml(asDateText(conversation.created_at))} · Updated: ${escapeHtml(asDateText(conversation.updated_at))} · Exported: ${escapeHtml(exportedAt)}</p>

    <h2>Conversation</h2>
    ${messageBlocks}

    <h2>Mind Map Nodes</h2>
    ${htmlTable(['Label', 'Type', 'Parent', 'Description'], nodeRows)}

    <h2>Mind Map Edges</h2>
    ${htmlTable(['Source', 'Target', 'Label'], edgeRows)}
  </main>
</body>
</html>`;
}

export function buildConversationExport(conversationId, requestedFormat = 'markdown') {
  const snapshot = getConversationSnapshot(conversationId);
  if (!snapshot) {
    return null;
  }

  const format = ['html', 'json'].includes(requestedFormat) ? requestedFormat : 'markdown';
  const baseName = slugify(snapshot.conversation.title, `conversation-${snapshot.conversation.id}`);

  if (format === 'json') {
    return {
      format,
      filename: `${baseName}.json`,
      content: toExportSnapshot(snapshot)
    };
  }

  if (format === 'html') {
    return {
      format,
      filename: `${baseName}.html`,
      content: toHtml(snapshot)
    };
  }

  return {
    format,
    filename: `${baseName}.md`,
    content: toMarkdown(snapshot)
  };
}
