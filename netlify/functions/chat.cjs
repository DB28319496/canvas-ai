// Lightweight Netlify function for AI chat — no Express overhead.
// This avoids the heavy cold start of the main api.cjs function.

let clientPromise;

function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    })();
  }
  return clientPromise;
}

const modelMap = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
  opus: 'claude-opus-4-20250514'
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const toneDescriptions = {
  professional: 'professional, polished, and business-appropriate',
  casual: 'casual, friendly, and conversational',
  academic: 'formal, precise, well-structured, and academic',
  creative: 'expressive, vivid, and creatively engaging',
  witty: 'clever, humorous, and sharp with wit',
  motivational: 'uplifting, energetic, and inspiring'
};

function buildVoiceToneBlock(settings) {
  if (!settings) return '';
  const parts = [];
  if (settings.preset?.length > 0) {
    const toneList = settings.preset.map(id => toneDescriptions[id]).filter(Boolean).join(', ');
    if (toneList) parts.push(`Tone style: Write in a way that is ${toneList}.`);
  }
  if (settings.customDescription?.trim()) {
    parts.push(`The user describes their voice as:\n"${settings.customDescription.trim()}"`);
  }
  if (settings.writingSamples?.trim()) {
    const s = settings.writingSamples.trim();
    parts.push(`Mirror the style of these writing samples:\n\n${s.length > 2000 ? s.slice(0, 2000) + '...' : s}`);
  }
  if (parts.length === 0) return '';
  return `\n\n---VOICE & TONE---\n${parts.join('\n\n')}\n---END VOICE & TONE---`;
}

function buildEdgeContext(canvasContext, edgeContext) {
  if (!edgeContext || edgeContext.length === 0) return '';
  const labels = {};
  (canvasContext || []).forEach(n => { if (n.id) labels[n.id] = n.label || n.id; });
  const conns = edgeContext.map(e => `"${labels[e.from] || e.from}" → "${labels[e.to] || e.to}"`).join('\n');
  return `\n\n---NODE CONNECTIONS---\n${conns}\n---END CONNECTIONS---`;
}

function buildSearchBlock(searchContext) {
  if (!searchContext || searchContext.length === 0) return '';
  const results = searchContext.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   Source: ${r.url}`).join('\n\n');
  return `\n\n---WEB SEARCH RESULTS---\n${results}\n---END SEARCH RESULTS---`;
}

function renderNode(node, index) {
  const label = node.label || `Node ${index + 1}`;
  switch (node.type) {
    case 'text': return `[TEXT NODE: "${label}"]\n${stripHtml(node.content) || '(empty)'}`;
    case 'image': return `[IMAGE NODE: "${label}"]\n${node.description || ''}`;
    case 'pdf': return `[PDF NODE: "${label}"]\n${node.content || '(not parsed)'}`;
    case 'youtube': return `[YOUTUBE NODE: "${label}"]\nTitle: ${node.title || ''}\nTranscript:\n${node.transcript || '(no transcript)'}`;
    case 'voice': return `[VOICE NOTE: "${label}"]\n${node.transcript || '(no transcript)'}`;
    case 'web': return `[WEB PAGE: "${label}"]\nURL: ${node.url || ''}\nTitle: ${node.title || ''}\nDescription: ${node.description || ''}\nScraped Content:\n${node.content || '(not scraped)'}`;
    case 'code': return `[CODE NODE: "${label}"]\n\`\`\`${node.language || 'js'}\n${node.content || ''}\n\`\`\``;
    case 'sticky': return `[STICKY NOTE: "${label}"]\n${node.content || '(empty)'}`;
    case 'embed': return `[EMBED NODE: "${label}"]\nURL: ${node.url || ''}`;
    default: return `[NODE: "${label}"]\n${node.content || ''}`;
  }
}

function buildSystemPrompt(canvasContext, voiceToneSettings, edgeContext, searchContext, groupContext, focusedGroupIds) {
  const vtBlock = buildVoiceToneBlock(voiceToneSettings);
  const edgeBlock = buildEdgeContext(canvasContext, edgeContext);
  const searchBlock = buildSearchBlock(searchContext);

  if (!canvasContext || canvasContext.length === 0) {
    return `You are Canvas AI, a helpful assistant for a visual canvas workspace. The user's canvas is currently empty. Help them get started or answer any questions.${searchBlock}${vtBlock}`;
  }

  // Build group label lookup
  const groupLabels = {};
  (groupContext || []).forEach(g => { groupLabels[g.id] = g.label; });

  // Organize nodes by group
  const grouped = {};
  const ungrouped = [];
  canvasContext.forEach((node, i) => {
    if (node.groupId) {
      if (!grouped[node.groupId]) grouped[node.groupId] = [];
      grouped[node.groupId].push({ node, index: i });
    } else {
      ungrouped.push({ node, index: i });
    }
  });

  // Render sections
  const sections = [];
  for (const [groupId, items] of Object.entries(grouped)) {
    const groupLabel = groupLabels[groupId] || 'Untitled Group';
    const nodeBlocks = items.map(({ node, index }) => renderNode(node, index)).join('\n\n');
    sections.push(`---GROUP: "${groupLabel}"---\n${nodeBlocks}\n---END GROUP---`);
  }
  if (ungrouped.length > 0) {
    const nodeBlocks = ungrouped.map(({ node, index }) => renderNode(node, index)).join('\n\n');
    sections.push(`---UNGROUPED NODES---\n${nodeBlocks}\n---END UNGROUPED---`);
  }

  let focusNote = '';
  if (focusedGroupIds && focusedGroupIds.length > 0) {
    const focusLabels = focusedGroupIds.map(id => groupLabels[id]).filter(Boolean);
    if (focusLabels.length > 0) {
      focusNote = `\n\nNOTE: The user is currently focused on these groups: ${focusLabels.map(l => `"${l}"`).join(', ')}. Prioritize content from these groups in your responses, but you may still reference other visible content if relevant.`;
    }
  }

  return `You are Canvas AI, a helpful assistant for a visual canvas workspace. The user has a canvas with the following content:

---CANVAS CONTENTS---
${sections.join('\n\n')}
---END CANVAS CONTENTS---
${edgeBlock}${focusNote}

You have full awareness of everything on the user's canvas. Nodes are organized into groups. Reference specific nodes and their group context when answering. Be helpful, creative, and thorough.

IMPORTANT — Web pages and URLs:
When the canvas contains WEB PAGE nodes, the page content has ALREADY been scraped and is included above as "Scraped Content." You DO have access to this content — read and analyze it directly. Never say you cannot access URLs or web pages when their scraped content is provided in the canvas contents above.

IMPORTANT — Creating canvas nodes:
If the user asks you to create/add content as a new note on the canvas, include this JSON block at the very end:

\`\`\`__CREATE_NODE__
{"type": "text", "label": "A short title", "content": "The full content here"}
\`\`\`

Only include this block when explicitly asked to create something on the canvas.${searchBlock}${vtBlock}`;
}

function parseNodeCreation(text) {
  const marker = '```__CREATE_NODE__';
  const idx = text.indexOf(marker);
  if (idx === -1) return { message: text, createNode: null };
  const message = text.slice(0, idx).trim();
  const jsonStart = idx + marker.length;
  const jsonEnd = text.indexOf('```', jsonStart);
  try {
    const nodeData = JSON.parse(text.slice(jsonStart, jsonEnd !== -1 ? jsonEnd : undefined).trim());
    return { message, createNode: nodeData };
  } catch { return { message: text, createNode: null }; }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return respond(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return respond(500, { error: 'Anthropic API key not configured.' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messages, canvasContext, voiceToneSettings, model, edgeContext, searchContext, groupContext, focusedGroupIds } = body;

    if (!messages || !Array.isArray(messages)) {
      return respond(400, { error: 'Messages array is required' });
    }

    const client = await getClient();
    const systemPrompt = buildSystemPrompt(canvasContext, voiceToneSettings, edgeContext, searchContext, groupContext, focusedGroupIds);
    const modelId = modelMap[model] || modelMap.sonnet;

    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages
    });

    const rawText = response.content[0].text;
    const { message, createNode } = parseNodeCreation(rawText);

    const result = { message, usage: response.usage };
    if (createNode) result.createNode = createNode;

    return respond(200, result);
  } catch (error) {
    console.error('Chat error:', error);
    const msg = error.status === 401
      ? 'Invalid API key.'
      : error.message || 'Failed to get AI response';
    return respond(error.status || 500, { error: msg });
  }
};
