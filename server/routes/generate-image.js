import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads');

let openaiClient = null;
function getClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
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

    // Download the image and save locally
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const filename = `generated-${uuidv4()}.png`;
    const filePath = path.join(uploadsDir, filename);

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    res.json({
      url: `/uploads/${filename}`,
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
