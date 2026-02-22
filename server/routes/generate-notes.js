import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const NOTES_SYSTEM_PROMPT = `You are an expert note-taker and content analyst. Your job is to take a transcript from a video or podcast and produce comprehensive, well-structured notes.

Format your notes using clean HTML that will render nicely in a rich text editor. Use this structure:

<h2>📋 Overview</h2>
<p>A 2-3 sentence summary of what the content covers.</p>

<h2>🔑 Key Takeaways</h2>
<ul>
<li><strong>Takeaway 1</strong> — Brief explanation</li>
<li><strong>Takeaway 2</strong> — Brief explanation</li>
</ul>

<h2>📝 Detailed Notes</h2>
<p>Organize by topic or chronologically. Use sub-headings for major sections.</p>
<h3>Topic/Section Name</h3>
<ul>
<li>Point with detail</li>
<li>Point with detail</li>
</ul>

<h2>💡 Notable Quotes</h2>
<ul>
<li><em>"Direct quote from the transcript"</em></li>
</ul>

<h2>🎯 Action Items / Next Steps</h2>
<ul>
<li>Any actionable advice or recommendations mentioned</li>
</ul>

Rules:
- Be thorough but concise — capture all important points without unnecessary filler
- Use bullet points liberally for scannability
- Bold key terms and names
- If the transcript is short or low-quality, do your best and note any limitations
- Always produce valid HTML — no markdown`;

router.post('/', async (req, res) => {
  try {
    const { transcript, title, url } = req.body;

    if (!transcript || transcript.trim().length < 20) {
      return res.status(400).json({ error: 'Transcript is too short to generate notes from.' });
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return res.status(500).json({ error: 'Anthropic API key not configured.' });
    }

    // Truncate to ~15k chars to keep within fast response times on serverless
    const truncatedTranscript = transcript.length > 15000 ? transcript.slice(0, 15000) + '\n\n[Transcript truncated...]' : transcript;

    const userMessage = title
      ? `Here is the transcript from "${title}"${url ? ` (${url})` : ''}:\n\n${truncatedTranscript}\n\nPlease generate comprehensive structured notes from this transcript.`
      : `Here is a transcript:\n\n${truncatedTranscript}\n\nPlease generate comprehensive structured notes from this transcript.`;

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: NOTES_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const notes = response.content[0].text;

    res.json({
      notes,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Generate notes error:', error);
    const message = error.status === 401
      ? 'Invalid API key.'
      : error.message || 'Failed to generate notes';
    res.status(error.status || 500).json({ error: message });
  }
});

export default router;
