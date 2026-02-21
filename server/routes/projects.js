import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

// GET /api/projects — List all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('projects')
      .select('id, name, nodes, updated_at, created_at')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const projects = data.map(p => ({
      id: p.id,
      name: p.name,
      nodeCount: p.nodes?.length || 0,
      updatedAt: p.updated_at,
      createdAt: p.created_at
    }));

    res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// POST /api/projects — Save or update a project
router.post('/', async (req, res) => {
  try {
    const { id, name, nodes, edges, chatMessages, viewport, voiceToneSettings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const db = getSupabase();
    let projectId = id;

    if (id) {
      // Update existing project — verify ownership
      const { data: existing, error: fetchErr } = await db
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { error: updateErr } = await db
        .from('projects')
        .update({
          name,
          nodes: nodes || [],
          edges: edges || [],
          chat_messages: chatMessages || [],
          viewport: viewport || { x: 0, y: 0, zoom: 1 },
          voice_tone_settings: voiceToneSettings || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.userId);

      if (updateErr) throw updateErr;
    } else {
      // Insert new project
      const { data: inserted, error: insertErr } = await db
        .from('projects')
        .insert({
          user_id: req.userId,
          name,
          nodes: nodes || [],
          edges: edges || [],
          chat_messages: chatMessages || [],
          viewport: viewport || { x: 0, y: 0, zoom: 1 },
          voice_tone_settings: voiceToneSettings || null
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      projectId = inserted.id;
    }

    // Save a version snapshot
    const projectData = { name, nodes, edges, chatMessages, viewport, voiceToneSettings };
    await db.from('project_versions').insert({
      project_id: projectId,
      data: projectData
    });

    res.json({ id: projectId, message: 'Project saved' });
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// GET /api/projects/:id — Load a specific project
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Map DB column names to camelCase for the client
    res.json({
      id: data.id,
      name: data.name,
      nodes: data.nodes || [],
      edges: data.edges || [],
      chatMessages: data.chat_messages || [],
      viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
      voiceToneSettings: data.voice_tone_settings || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Load project error:', error);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// GET /api/projects/:id/versions — List version history
router.get('/:id/versions', async (req, res) => {
  try {
    // Verify ownership first
    const { data: project, error: projErr } = await getSupabase()
      .from('projects')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (projErr || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data, error } = await getSupabase()
      .from('project_versions')
      .select('id, data, created_at')
      .eq('project_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const versions = data.map(v => ({
      id: v.id,
      timestamp: v.created_at,
      nodeCount: v.data?.nodes?.length || 0,
      edgeCount: v.data?.edges?.length || 0,
      name: v.data?.name || ''
    }));

    res.json(versions);
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

// GET /api/projects/:id/versions/:versionId — Load a specific version
router.get('/:id/versions/:versionId', async (req, res) => {
  try {
    // Verify ownership
    const { data: project, error: projErr } = await getSupabase()
      .from('projects')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (projErr || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data, error } = await getSupabase()
      .from('project_versions')
      .select('data, created_at')
      .eq('id', req.params.versionId)
      .eq('project_id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Return the version data in the same format the client expects
    const versionData = data.data || {};
    res.json({
      id: req.params.id,
      name: versionData.name,
      nodes: versionData.nodes || [],
      edges: versionData.edges || [],
      chatMessages: versionData.chatMessages || [],
      viewport: versionData.viewport || { x: 0, y: 0, zoom: 1 },
      voiceToneSettings: versionData.voiceToneSettings || null,
      createdAt: data.created_at,
      updatedAt: data.created_at
    });
  } catch (error) {
    console.error('Load version error:', error);
    res.status(500).json({ error: 'Failed to load version' });
  }
});

// DELETE /api/projects/:id — Delete a project (versions cascade automatically)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
