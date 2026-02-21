import { Router } from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

const router = Router();

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch video title via YouTube's oEmbed API (no API key required)
async function fetchVideoTitle(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return data.title || null;
    }
  } catch (err) {
    console.error('oEmbed title fetch failed:', err.message);
  }
  return null;
}

// Try to fetch transcript using the youtube-transcript library
async function fetchTranscript(videoId) {
  const langCodes = [undefined, 'en', 'en-US', 'en-GB'];
  for (const lang of langCodes) {
    try {
      const config = lang ? { lang } : {};
      const items = await YoutubeTranscript.fetchTranscript(videoId, config);
      if (items && items.length > 0) {
        return items.map(item => item.text).join(' ');
      }
    } catch (e) {
      // Try next language
    }
  }
  return null;
}

// POST /api/youtube — Fetch transcript and thumbnail for a YouTube video
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Fetch title and transcript in parallel
    const [title, transcript] = await Promise.all([
      fetchVideoTitle(videoId),
      fetchTranscript(videoId)
    ]);

    const hasTranscript = transcript && transcript.length > 0;

    res.json({
      videoId,
      url,
      thumbnail,
      title: title || `YouTube Video (${videoId})`,
      transcript: hasTranscript ? transcript : '',
      transcriptAvailable: hasTranscript
    });
  } catch (error) {
    console.error('YouTube error:', error);
    res.status(500).json({ error: error.message || 'Failed to process YouTube URL' });
  }
});

export default router;
