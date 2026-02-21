import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectsDir = process.env.PROJECTS_DIR || path.resolve(__dirname, '../../projects');
const MAX_VERSIONS = 30;

// Ensure projects directory exists
if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true });
}

// Save a version snapshot for a project
function saveVersionSnapshot(projectId, projectData) {
  const versionsDir = path.join(projectsDir, `${projectId}_versions`);
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const versionFile = path.join(versionsDir, `${timestamp}.json`);
  fs.writeFileSync(versionFile, JSON.stringify(projectData));

  // Prune old versions beyond the limit
  const files = fs.readdirSync(versionsDir)
    .filter(f => f.endsWith('.json'))
    .sort();
  if (files.length > MAX_VERSIONS) {
    const toDelete = files.slice(0, files.length - MAX_VERSIONS);
    toDelete.forEach(f => fs.unlinkSync(path.join(versionsDir, f)));
  }
}

// GET /api/projects — List all saved projects
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
    const projects = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(projectsDir, file), 'utf-8'));
      return {
        id: data.id,
        name: data.name,
        nodeCount: data.nodes?.length || 0,
        updatedAt: data.updatedAt,
        createdAt: data.createdAt
      };
    });
    // Sort by most recently updated
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// POST /api/projects — Save a canvas as a project
router.post('/', (req, res) => {
  try {
    const { id, name, nodes, edges, chatMessages, viewport } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectId = id || uuidv4();
    const now = new Date().toISOString();

    const project = {
      id: projectId,
      name,
      nodes: nodes || [],
      edges: edges || [],
      chatMessages: chatMessages || [],
      viewport: viewport || { x: 0, y: 0, zoom: 1 },
      createdAt: id ? undefined : now, // preserve original createdAt on update
      updatedAt: now
    };

    // If updating, preserve the original createdAt
    const filePath = path.join(projectsDir, `${projectId}.json`);
    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      project.createdAt = existing.createdAt;
    } else {
      project.createdAt = now;
    }

    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

    // Save a version snapshot
    saveVersionSnapshot(projectId, project);

    res.json({ id: projectId, message: 'Project saved' });
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// GET /api/projects/:id — Load a specific project
router.get('/:id', (req, res) => {
  try {
    const filePath = path.join(projectsDir, `${req.params.id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(project);
  } catch (error) {
    console.error('Load project error:', error);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// GET /api/projects/:id/versions — List version history
router.get('/:id/versions', (req, res) => {
  try {
    const versionsDir = path.join(projectsDir, `${req.params.id}_versions`);
    if (!fs.existsSync(versionsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(versionsDir)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // newest first

    const versions = files.map(file => {
      const timestamp = parseInt(file.replace('.json', ''), 10);
      const data = JSON.parse(fs.readFileSync(path.join(versionsDir, file), 'utf-8'));
      return {
        id: timestamp,
        timestamp: new Date(timestamp).toISOString(),
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0,
        name: data.name
      };
    });

    res.json(versions);
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

// GET /api/projects/:id/versions/:versionId — Load a specific version
router.get('/:id/versions/:versionId', (req, res) => {
  try {
    const versionFile = path.join(
      projectsDir,
      `${req.params.id}_versions`,
      `${req.params.versionId}.json`
    );

    if (!fs.existsSync(versionFile)) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const version = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    res.json(version);
  } catch (error) {
    console.error('Load version error:', error);
    res.status(500).json({ error: 'Failed to load version' });
  }
});

// DELETE /api/projects/:id — Delete a project
router.delete('/:id', (req, res) => {
  try {
    const filePath = path.join(projectsDir, `${req.params.id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    fs.unlinkSync(filePath);

    // Also delete version history
    const versionsDir = path.join(projectsDir, `${req.params.id}_versions`);
    if (fs.existsSync(versionsDir)) {
      fs.readdirSync(versionsDir).forEach(f => fs.unlinkSync(path.join(versionsDir, f)));
      fs.rmdirSync(versionsDir);
    }

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
