import { Router } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

// POST /api/web-search — Search the web via DuckDuckGo HTML and return results
router.post('/', async (req, res) => {
  try {
    const { query, count = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CanvasAI/1.0)',
        'Accept': 'text/html'
      }
    });
    clearTimeout(timeout);

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];
    $('.result').each((i, el) => {
      if (i >= count) return false;

      const titleEl = $(el).find('.result__a');
      const snippetEl = $(el).find('.result__snippet');
      const urlEl = $(el).find('.result__url');

      const title = titleEl.text().trim();
      const snippet = snippetEl.text().trim();
      let url = urlEl.attr('href') || titleEl.attr('href') || '';

      // DuckDuckGo wraps URLs in redirect — extract actual URL
      if (url.includes('uddg=')) {
        try {
          url = decodeURIComponent(url.split('uddg=')[1]?.split('&')[0] || url);
        } catch {
          // keep original
        }
      }

      if (title && snippet) {
        results.push({ title, snippet, url });
      }
    });

    res.json({ query, results });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Search timed out' });
    }
    console.error('Web search error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

export default router;
