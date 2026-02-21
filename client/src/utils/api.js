const API_BASE = '/api';

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
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, canvasContext, voiceToneSettings, model, edgeContext })
  });
  return handleResponse(response);
}

// Upload a file (image or PDF)
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  return handleResponse(response);
}

// Fetch YouTube transcript and thumbnail
export async function fetchYouTubeData(url) {
  const response = await fetch(`${API_BASE}/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return handleResponse(response);
}

// List all projects
export async function listProjects() {
  const response = await fetch(`${API_BASE}/projects`);
  return handleResponse(response);
}

// Save a project
export async function saveProject(project) {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  return handleResponse(response);
}

// Load a project by ID
export async function loadProject(id) {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  return handleResponse(response);
}

// Delete a project
export async function deleteProject(id) {
  const response = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  return handleResponse(response);
}

// Generate an image from a text prompt via DALL-E
export async function generateImage(prompt, size = '1024x1024') {
  const response = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size })
  });
  return handleResponse(response);
}

// Search the web
export async function webSearch(query) {
  const response = await fetch(`${API_BASE}/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return handleResponse(response);
}

// List version history for a project
export async function listVersions(projectId) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/versions`);
  return handleResponse(response);
}

// Load a specific version
export async function loadVersion(projectId, versionId) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/versions/${versionId}`);
  return handleResponse(response);
}

// Scrape content from a URL
export async function scrapeUrl(url) {
  const response = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return handleResponse(response);
}

// Stream a chat message via SSE — calls onChunk for each token, onDone when complete
export async function streamChatMessage(messages, canvasContext, voiceToneSettings, model = 'sonnet', edgeContext = [], searchContext = null, { onChunk, onDone, onError }) {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, canvasContext, voiceToneSettings, model, edgeContext, searchContext })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'text') {
          onChunk?.(event.text);
        } else if (event.type === 'done') {
          onDone?.(event.message, event.createNode);
        } else if (event.type === 'error') {
          onError?.(event.error);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}
