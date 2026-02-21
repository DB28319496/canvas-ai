/**
 * Export canvas content as a PDF using the browser's print dialog.
 * Builds a clean HTML document from the canvas nodes, opens in a new window, and triggers print.
 */
export function exportAsPdf(nodes, projectName = 'Canvas AI Export') {
  if (!nodes || nodes.length === 0) {
    alert('Canvas is empty — nothing to export');
    return;
  }

  const sections = nodes.map(node => {
    const label = node.data?.label || 'Untitled';

    switch (node.type) {
      case 'text':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <div class="content">${node.data?.content || '<em>(empty)</em>'}</div>
        </div>`;
      case 'image':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          ${node.data?.imageUrl ? `<img src="${esc(node.data.imageUrl)}" style="max-width:100%;max-height:400px;border-radius:8px;" />` : ''}
          ${node.data?.description ? `<p class="meta">${esc(node.data.description)}</p>` : ''}
        </div>`;
      case 'pdf':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <p class="meta">File: ${esc(node.data?.filename || 'unknown')} (${node.data?.pageCount || '?'} pages)</p>
          ${node.data?.parsedText ? `<pre class="text-block">${esc(node.data.parsedText)}</pre>` : ''}
        </div>`;
      case 'youtube':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <p class="meta">Video: ${esc(node.data?.title || '')} — ${esc(node.data?.url || '')}</p>
          ${node.data?.transcript ? `<pre class="text-block">${esc(node.data.transcript)}</pre>` : ''}
        </div>`;
      case 'voice':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          ${node.data?.transcript ? `<pre class="text-block">${esc(node.data.transcript)}</pre>` : '<p class="meta">(no transcript)</p>'}
        </div>`;
      case 'web':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <p class="meta">${esc(node.data?.url || '')}</p>
          ${node.data?.title ? `<p><strong>${esc(node.data.title)}</strong></p>` : ''}
          ${node.data?.description ? `<p>${esc(node.data.description)}</p>` : ''}
          ${node.data?.content ? `<pre class="text-block">${esc(node.data.content?.slice(0, 3000))}</pre>` : ''}
        </div>`;
      case 'code':
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <p class="meta">Language: ${esc(node.data?.language || 'javascript')}</p>
          <pre class="code-block">${esc(node.data?.content || '')}</pre>
        </div>`;
      case 'sticky':
        return `<div class="section sticky" style="background:${stickyColor(node.data?.color)}">
          <h3>${esc(label)}</h3>
          <p>${esc(node.data?.content || '')}</p>
        </div>`;
      case 'group':
        return `<div class="section group-section">
          <h2>${esc(label)}</h2>
          <p class="meta">(Frame/Group container)</p>
        </div>`;
      default:
        return `<div class="section">
          <h2>${esc(label)}</h2>
          <p>${esc(node.data?.content || '')}</p>
        </div>`;
    }
  }).join('\n');

  // Include chat if available
  const chatMessages = window.__canvasAIChatMessages || [];
  let chatHtml = '';
  if (chatMessages.length > 0) {
    chatHtml = `<div class="section chat-section">
      <h2>Chat History</h2>
      ${chatMessages.map(m => `
        <div class="chat-msg ${m.role}">
          <strong>${m.role === 'user' ? 'You' : 'AI'}:</strong>
          <p>${esc(m.content)}</p>
        </div>
      `).join('\n')}
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(projectName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-bottom: 32px; }
    h2 { font-size: 18px; color: #333; margin-top: 0; }
    h3 { font-size: 15px; margin-top: 0; }
    .section { margin-bottom: 28px; padding: 16px 20px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
    .meta { font-size: 12px; color: #6b7280; margin: 4px 0; }
    .content { font-size: 14px; }
    .text-block { font-size: 12px; background: #f9fafb; padding: 12px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; overflow: hidden; max-height: 400px; }
    .code-block { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; background: #1e1e1e; color: #d4d4d4; padding: 14px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; }
    .sticky { border-radius: 4px; border: none; }
    .group-section { border-style: dashed; border-color: #f59e0b; }
    .chat-section { background: #f8f9fa; }
    .chat-msg { margin-bottom: 12px; font-size: 13px; }
    .chat-msg.user { color: #4338ca; }
    .chat-msg.assistant { color: #1a1a1a; }
    .chat-msg p { margin: 4px 0 0; white-space: pre-wrap; }
    img { display: block; margin: 8px 0; }
    @media print {
      body { padding: 0; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${esc(projectName)}</h1>
  ${sections}
  ${chatHtml}
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for images to load before printing
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stickyColor(color) {
  const colors = {
    yellow: '#fef9c3',
    pink: '#fce7f3',
    blue: '#dbeafe',
    green: '#dcfce7',
    purple: '#f3e8ff',
    orange: '#ffedd5'
  };
  return colors[color] || colors.yellow;
}
