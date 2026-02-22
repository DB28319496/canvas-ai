import { supabase } from './supabase.js';

const API_BASE = '/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      response.ok
        ? 'Server returned non-JSON response'
        : `Request failed (${response.status}). Make sure the API server is running.`
    );
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

// Send a chat message with canvas context to Claude
export async function sendChatMessage(messages, canvasContext, voiceToneSettings, model = 'sonnet', edgeContext = []) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ messages, canvasContext, voiceToneSettings, model, edgeContext })
  });
  return handleResponse(response);
}

// Upload a file (image or PDF)
export async function uploadFile(file) {
  const auth = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { ...auth },
    body: formData
  });
  return handleResponse(response);
}

// Fetch YouTube transcript and thumbnail
export async function fetchYouTubeData(url) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ url })
  });
  return handleResponse(response);
}

// List all projects
export async function listProjects() {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects`, {
    headers: { ...auth }
  });
  return handleResponse(response);
}

// Save a project
export async function saveProject(project) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(project)
  });
  return handleResponse(response);
}

// Load a project by ID
export async function loadProject(id) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    headers: { ...auth }
  });
  return handleResponse(response);
}

// Delete a project
export async function deleteProject(id) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: { ...auth }
  });
  return handleResponse(response);
}

// Generate an image from a text prompt via DALL-E
export async function generateImage(prompt, size = '1024x1024') {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ prompt, size })
  });
  return handleResponse(response);
}

// Search the web
export async function webSearch(query) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ query })
  });
  return handleResponse(response);
}

// List version history for a project
export async function listVersions(projectId) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects/${projectId}/versions`, {
    headers: { ...auth }
  });
  return handleResponse(response);
}

// Load a specific version
export async function loadVersion(projectId, versionId) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/projects/${projectId}/versions/${versionId}`, {
    headers: { ...auth }
  });
  return handleResponse(response);
}

// Duplicate a project — loads full data, saves as new with "(Copy)" suffix
export async function duplicateProject(id) {
  const original = await loadProject(id);
  const copy = {
    name: `${original.name} (Copy)`,
    nodes: original.nodes || [],
    edges: original.edges || [],
    chatMessages: original.chatMessages || [],
    viewport: original.viewport || { x: 0, y: 0, zoom: 1 },
    voiceToneSettings: original.voiceToneSettings || null
  };
  return saveProject(copy);
}

// Generate structured notes from a transcript
export async function generateNotes(transcript, title, url) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/generate-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ transcript, title, url })
  });
  return handleResponse(response);
}

// Scrape content from a URL
export async function scrapeUrl(url) {
  const auth = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ url })
  });
  return handleResponse(response);
}

// Stream a chat message via SSE — calls onChunk for each token, onDone when complete.
// Falls back to non-streaming endpoint if SSE fails (e.g. on serverless platforms).
export async function streamChatMessage(messages, canvasContext, voiceToneSettings, model = 'sonnet', edgeContext = [], searchContext = null, { onChunk, onDone, onError }) {
  const auth = await getAuthHeaders();
  const payload = { messages, canvasContext, voiceToneSettings, model, edgeContext, searchContext };
  let doneReceived = false;

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Stream request failed (${response.status})`);
    }

    // Try to read as SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text') {
            onChunk?.(event.text);
          } else if (event.type === 'done') {
            doneReceived = true;
            onDone?.(event.message, event.createNode);
          } else if (event.type === 'error') {
            onError?.(event.error);
            return;
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // Process any remaining buffer
    if (!doneReceived && buffer.trim()) {
      const remaining = buffer.split('\n');
      for (const line of remaining) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'done') {
            doneReceived = true;
            onDone?.(event.message, event.createNode);
          }
        } catch {}
      }
    }

    if (doneReceived) return;
    // Stream completed without a 'done' event — fall through to fallback
  } catch {
    // Stream failed — fall through to fallback
  }

  // Fallback: use non-streaming chat endpoint
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    onDone?.(data.message, data.createNode);
  } catch (err) {
    onError?.(err.message);
  }
}
