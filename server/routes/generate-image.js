import { Router } from 'express';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let openaiClient = null;
function getClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

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

// POST /api/generate-image — Generate an image from a text prompt
router.post('/', async (req, res) => {
  try {
    const { prompt, size = '1024x1024' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(501).json({
        error: 'Image generation not configured. Add OPENAI_API_KEY to your .env file to enable DALL-E.'
      });
    }

    const response = await getClient().images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      response_format: 'url'
    });

    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to Supabase Storage
    const filename = `generated-${uuidv4()}.png`;
    const storagePath = `${req.userId}/${filename}`;

    const { error: uploadError } = await getSupabase()
      .storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = getSupabase()
      .storage
      .from('uploads')
      .getPublicUrl(storagePath);

    res.json({
      url: publicUrl,
      filename,
      prompt,
      revisedPrompt
    });
  } catch (error) {
    console.error('Image generation error:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate image'
    });
  }
});

export default router;
