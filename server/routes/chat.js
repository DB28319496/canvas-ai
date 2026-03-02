import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Lazily initialize the Anthropic client so dotenv has time to load
let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Model ID mapping
const modelMap = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
  opus: 'claude-opus-4-20250514'
};

// Strip HTML tags from rich text content for AI context
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Map preset tone IDs to descriptive instructions
const toneDescriptions = {
  professional: 'professional, polished, and business-appropriate',
  casual: 'casual, friendly, and conversational',
  academic: 'formal, precise, well-structured, and academic',
  creative: 'expressive, vivid, and creatively engaging',
  witty: 'clever, humorous, and sharp with wit',
  motivational: 'uplifting, energetic, and inspiring'
};

// Build voice/tone instruction block from user settings
function buildVoiceToneBlock(voiceToneSettings) {
  if (!voiceToneSettings) return '';

  const parts = [];

  // Preset tones
  if (voiceToneSettings.preset?.length > 0) {
    const toneList = voiceToneSettings.preset
      .map(id => toneDescriptions[id])
      .filter(Boolean)
      .join(', ');
    if (toneList) {
      parts.push(`Tone style: Write in a way that is ${toneList}.`);
    }
  }

  // Custom description
  if (voiceToneSettings.customDescription?.trim()) {
    parts.push(`The user describes their personal voice as follows:\n"${voiceToneSettings.customDescription.trim()}"`);
  }

  // Writing samples
  if (voiceToneSettings.writingSamples?.trim()) {
    const samples = voiceToneSettings.writingSamples.trim();
    const truncated = samples.length > 2000 ? samples.slice(0, 2000) + '...' : samples;
    parts.push(`Here are examples of the user's writing. Mirror their style, rhythm, word choice, and personality:\n\n${truncated}`);
  }

  if (parts.length === 0) return '';

  return `\n\n---VOICE & TONE---\nIMPORTANT: The user has configured their personal voice and tone preferences. All content you generate MUST match this style. Adapt your vocabulary, sentence structure, personality, and formatting to align with these instructions:\n\n${parts.join('\n\n')}\n---END VOICE & TONE---`;
}

// Build edge connection context
function buildEdgeContext(canvasContext, edgeContext) {
  if (!edgeContext || edgeContext.length === 0) return '';

  const nodeLabels = {};
  (canvasContext || []).forEach(node => {
    if (node.id) nodeLabels[node.id] = node.label || node.id;
  });

  const connections = edgeContext
    .map(e => `"${nodeLabels[e.from] || e.from}" → "${nodeLabels[e.to] || e.to}"`)
    .join('\n');

  return `\n\n---NODE CONNECTIONS---\nThe following nodes are connected on the canvas (arrows indicate relationships the user has drawn):\n${connections}\n---END CONNECTIONS---`;
}

// Build web search context block
function buildSearchBlock(searchContext) {
  if (!searchContext || searchContext.length === 0) return '';

  const results = searchContext.map((r, i) =>
    `${i + 1}. **${r.title}**\n   ${r.snippet}\n   Source: ${r.url}`
  ).join('\n\n');

  return `\n\n---WEB SEARCH RESULTS---\nThe following are real-time web search results relevant to the user's question. Use these to provide up-to-date, accurate information. Cite sources when referencing them.\n\n${results}\n---END SEARCH RESULTS---`;
}

// Render a single node to text for the system prompt
function renderNode(node, index) {
  const label = node.label || `Node ${index + 1}`;
  switch (node.type) {
    case 'text':
      return `[TEXT NODE: "${label}"]\n${stripHtml(node.content) || '(empty)'}`;
    case 'image':
      return `[IMAGE NODE: "${label}"]\nFilename: ${node.filename || 'unknown'}\n${node.description || ''}`;
    case 'pdf':
      return `[PDF NODE: "${label}"]\nFilename: ${node.filename || 'unknown'}\nPages: ${node.pageCount || '?'}\nContent:\n${node.content || '(not parsed)'}`;
    case 'youtube':
      return `[YOUTUBE NODE: "${label}"]\nURL: ${node.url || ''}\nTitle: ${node.title || ''}\nTranscript:\n${node.transcript || '(no transcript)'}`;
    case 'voice':
      return `[VOICE NOTE: "${label}"]\nTranscript:\n${node.transcript || '(no transcript)'}`;
    case 'web':
      return `[WEB PAGE: "${label}"]\nURL: ${node.url || ''}\nTitle: ${node.title || ''}\nDescription: ${node.description || ''}\nScraped Content:\n${node.content || '(not scraped)'}`;
    case 'code':
      return `[CODE NODE: "${label}"]\nLanguage: ${node.language || 'javascript'}\n\`\`\`${node.language || 'javascript'}\n${node.content || '(empty)'}\n\`\`\``;
    case 'sticky':
      return `[STICKY NOTE: "${label}"]\n${node.content || '(empty)'}`;
    case 'embed':
      return `[EMBED NODE: "${label}"]\nURL: ${node.url || '(no URL)'}`;
    default:
      return `[NODE: "${label}"]\n${node.content || ''}`;
  }
}

// Build a system prompt that includes all canvas content, organized by groups
function buildSystemPrompt(canvasContext, voiceToneSettings, edgeContext, searchContext, groupContext, focusedGroupIds) {
  const voiceToneBlock = buildVoiceToneBlock(voiceToneSettings);
  const edgeBlock = buildEdgeContext(canvasContext, edgeContext);
  const searchBlock = buildSearchBlock(searchContext);

  if (!canvasContext || canvasContext.length === 0) {
    return `You are Canvas AI, a helpful assistant for a visual canvas workspace. The user's canvas is currently empty. Help them get started or answer any questions.${searchBlock}${voiceToneBlock}`;
  }

  // Build group label lookup from groupContext
  const groupLabels = {};
  (groupContext || []).forEach(g => { groupLabels[g.id] = g.label; });

  // Organize nodes by group
  const grouped = {};  // groupId -> nodes
  const ungrouped = [];
  canvasContext.forEach((node, i) => {
    if (node.groupId) {
      if (!grouped[node.groupId]) grouped[node.groupId] = [];
      grouped[node.groupId].push({ node, index: i });
    } else {
      ungrouped.push({ node, index: i });
    }
  });

  // Render content blocks organized by group
  const sections = [];

  // Grouped nodes
  for (const [groupId, items] of Object.entries(grouped)) {
    const groupLabel = groupLabels[groupId] || 'Untitled Group';
    const nodeBlocks = items.map(({ node, index }) => renderNode(node, index)).join('\n\n');
    sections.push(`---GROUP: "${groupLabel}"---\n${nodeBlocks}\n---END GROUP---`);
  }

  // Ungrouped nodes
  if (ungrouped.length > 0) {
    const nodeBlocks = ungrouped.map(({ node, index }) => renderNode(node, index)).join('\n\n');
    sections.push(`---UNGROUPED NODES---\n${nodeBlocks}\n---END UNGROUPED---`);
  }

  // Focus note when specific groups are selected
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

You have full awareness of everything on the user's canvas. Nodes are organized into groups. When answering questions, reference specific nodes and their group context. Be helpful, creative, and thorough. If asked to create content based on what's on the canvas, use all relevant materials.

IMPORTANT — Web pages and URLs:
When the canvas contains WEB PAGE nodes, the page content has ALREADY been scraped and is included above as "Scraped Content." You DO have access to this content — read and analyze it directly. Never say you cannot access URLs or web pages when their scraped content is provided in the canvas contents above.

IMPORTANT — Creating canvas nodes:
If the user asks you to create, generate, or add content as a new note/node on the canvas, you MUST include a special JSON block at the very end of your response (after your main text) in this exact format:

\`\`\`__CREATE_NODE__
{"type": "text", "label": "A short title", "content": "The full content here"}
\`\`\`

Only include this block when the user explicitly asks to create/add/put something on the canvas. Do NOT include it for regular conversation.${searchBlock}${voiceToneBlock}`;
}

// Parse AI response for node creation commands
function parseNodeCreation(text) {
  const marker = '```__CREATE_NODE__';
  const idx = text.indexOf(marker);
  if (idx === -1) return { message: text, createNode: null };

  const message = text.slice(0, idx).trim();
  const jsonStart = idx + marker.length;
  const jsonEnd = text.indexOf('```', jsonStart);
  const jsonStr = text.slice(jsonStart, jsonEnd !== -1 ? jsonEnd : undefined).trim();

  try {
    const nodeData = JSON.parse(jsonStr);
    return { message, createNode: nodeData };
  } catch {
    return { message: text, createNode: null };
  }
}

// POST /api/chat — Chat with Claude using canvas context
router.post('/', async (req, res) => {
  try {
    const { messages, canvasContext, voiceToneSettings, model, edgeContext, searchContext, groupContext, focusedGroupIds } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return res.status(500).json({
        error: 'Anthropic API key not configured. Add your key to the .env file.'
      });
    }

    const systemPrompt = buildSystemPrompt(canvasContext, voiceToneSettings, edgeContext, searchContext, groupContext, focusedGroupIds);
    const modelId = modelMap[model] || modelMap.sonnet;

    // Convert messages to Claude format
    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const response = await getClient().messages.create({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages
    });

    const rawText = response.content[0].text;
    const { message: assistantMessage, createNode } = parseNodeCreation(rawText);

    const result = {
      message: assistantMessage,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    };

    if (createNode) {
      result.createNode = createNode;
    }

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    const message = error.status === 401
      ? 'Invalid API key. Check your ANTHROPIC_API_KEY in .env'
      : error.message || 'Failed to get AI response';
    res.status(error.status || 500).json({ error: message });
  }
});

// POST /api/chat/stream — Stream chat responses using SSE
router.post('/stream', async (req, res) => {
  try {
    const { messages, canvasContext, voiceToneSettings, model, edgeContext, searchContext, groupContext, focusedGroupIds } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return res.status(500).json({
        error: 'Anthropic API key not configured. Add your key to the .env file.'
      });
    }

    const systemPrompt = buildSystemPrompt(canvasContext, voiceToneSettings, edgeContext, searchContext, groupContext, focusedGroupIds);
    const modelId = modelMap[model] || modelMap.sonnet;

    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = getClient().messages.stream({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages
    });

    let fullText = '';

    stream.on('text', (text) => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    });

    stream.on('end', () => {
      const { message, createNode } = parseNodeCreation(fullText);
      res.write(`data: ${JSON.stringify({ type: 'done', message, createNode: createNode || undefined })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      stream.abort();
    });
  } catch (error) {
    console.error('Stream setup error:', error);
    res.status(500).json({ error: error.message || 'Failed to start stream' });
  }
});

export default router;
