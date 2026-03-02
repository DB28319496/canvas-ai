import { Router } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

// Fetch rendered content via Jina Reader (handles JS-rendered pages)
async function fetchWithJina(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const text = await response.text();
    // Jina returns markdown — clean it up and truncate
    return text?.trim() || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// POST /api/scrape — Fetch and extract content from a URL
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CanvasAI/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch URL (${response.status})` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, header elements
    $('script, style, nav, footer, header, iframe, noscript, svg').remove();

    // Extract metadata
    const title = $('title').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('h1').first().text().trim() ||
                  parsedUrl.hostname;

    const description = $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content') ||
                        '';

    // Extract favicon
    const faviconHref = $('link[rel="icon"]').attr('href') ||
                        $('link[rel="shortcut icon"]').attr('href') ||
                        '/favicon.ico';
    const favicon = faviconHref.startsWith('http')
      ? faviconHref
      : `${parsedUrl.origin}${faviconHref.startsWith('/') ? '' : '/'}${faviconHref}`;

    // Extract main content — prefer article or main, fall back to body paragraphs
    let content = '';
    const mainEl = $('article, main, [role="main"]').first();
    if (mainEl.length) {
      content = mainEl.find('p, h1, h2, h3, h4, li').map((_, el) => $(el).text().trim()).get().join('\n\n');
    } else {
      content = $('body p, body h1, body h2, body h3, body h4, body li')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 20)
        .join('\n\n');
    }

    // If static scrape found little/no content, try Jina Reader for JS-rendered pages
    if (!content || content.length < 100) {
      const jinaContent = await fetchWithJina(parsedUrl.href);
      if (jinaContent && jinaContent.length > (content?.length || 0)) {
        content = jinaContent;
      }
    }

    // Truncate to 8000 chars (increased to support richer content)
    if (content.length > 8000) {
      content = content.slice(0, 8000) + '\n\n[Content truncated...]';
    }

    // Final fallback if both methods failed
    if (!content) {
      content = '(Unable to extract content from this page. Try sharing a screenshot or pasting the text directly.)';
    }

    res.json({
      url: parsedUrl.href,
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      content,
      favicon
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out fetching URL' });
    }
    console.error('Scrape error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape URL' });
  }
});

export default router;
