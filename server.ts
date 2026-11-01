/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { executeSearchAndSummarize, fetchGoogleSuggestions } from './src/server/searchService.ts';
import { handleConversationalChitChat, createChitChatSynthesis } from './src/server/conversationalEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio requires dev server on port 3000
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'SearchBot Algorithmic NLP Engine (0 AI, 0 API keys)',
      timestamp: Date.now(),
    });
  });

  // Real-time search suggestions (powered by Google Autocomplete)
  app.get('/api/suggestions', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
      }
      const suggestions = await fetchGoogleSuggestions(q);
      res.json({ suggestions });
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      res.json({ suggestions: [] });
    }
  });

  // Main search and algorithmic summarization endpoint
  app.post('/api/search', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Query string is required' });
      }

      const trimmed = query.trim();

      // Check if query is conversational chit-chat / greeting (no search required)
      const chitChat = handleConversationalChitChat(trimmed);
      if (chitChat) {
        console.log(`[Nova] Handling conversational message: "${trimmed}"`);
        const synthesis = createChitChatSynthesis(trimmed, chitChat);
        return res.json(synthesis);
      }

      console.log(`[Nova] Investigating topic: "${trimmed}"`);
      const synthesis = await executeSearchAndSummarize(trimmed);
      res.json(synthesis);
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Search synthesis failed' });
    }
  });

  // Streaming chat endpoint conforming to WebMind AI event protocol
  app.post('/api/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const messages = req.body?.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        sendEvent('error', { text: 'No message provided' });
        return res.end();
      }

      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
      const trimmed = String(lastUserMsg).trim();

      if (!trimmed) {
        sendEvent('error', { text: 'Empty message' });
        return res.end();
      }

      // 1. Check if conversational chit-chat / greeting
      const chitChat = handleConversationalChitChat(trimmed);
      if (chitChat) {
        sendEvent('status', { text: '' });
        const tokens = chitChat.reply.split(/(\s+)/);
        for (const token of tokens) {
          sendEvent('token', { text: token });
          await new Promise(r => setTimeout(r, 16));
        }
        return res.end();
      }

      // 2. Real query: search & extract facts
      sendEvent('status', { text: 'Searching the web…' });

      const synthesis = await executeSearchAndSummarize(trimmed);

      // Emit sources
      const sourcesSafe = synthesis.sources.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url,
        domain: s.domain,
      }));

      sendEvent('sources', sourcesSafe);
      sendEvent('status', { text: '' });

      // Build coherent answer formatted for WebMind AI markdown parser
      let fullAnswer = '';
      if (synthesis.directAnswer) {
        fullAnswer += `**${synthesis.directAnswer}**\n\n`;
      }
      if (synthesis.executiveSummary && synthesis.executiveSummary !== synthesis.directAnswer) {
        const remaining = synthesis.executiveSummary.startsWith(synthesis.directAnswer || '')
          ? synthesis.executiveSummary.slice(synthesis.directAnswer?.length || 0).trim()
          : synthesis.executiveSummary;
        if (remaining) {
          fullAnswer += `${remaining}\n\n`;
        }
      }
      if (synthesis.keyTakeaways && synthesis.keyTakeaways.length > 0) {
        fullAnswer += `### Key Highlights\n`;
        synthesis.keyTakeaways.forEach(t => {
          const cites = t.sourceIds.map(id => `[${id}]`).join('');
          fullAnswer += `- ${t.text} ${cites}\n`;
        });
        fullAnswer += `\n`;
      }
      if (synthesis.comparisonData) {
        fullAnswer += `### Comparison: ${synthesis.comparisonData.entityA} vs ${synthesis.comparisonData.entityB}\n`;
        synthesis.comparisonData.aspects.forEach(a => {
          fullAnswer += `- **${a.aspect}**: ${a.entityAValue} (vs ${a.entityBValue})\n`;
        });
        fullAnswer += `\n`;
      }

      if (!fullAnswer.trim()) {
        fullAnswer = `I reviewed the available publications for "${trimmed}". Check the source links below for detailed information.`;
      }

      // Stream tokens
      const tokens = fullAnswer.split(/(\s+)/);
      for (const token of tokens) {
        sendEvent('token', { text: token });
        await new Promise(r => setTimeout(r, 12));
      }

      res.end();
    } catch (err: any) {
      console.error('Chat endpoint error:', err);
      sendEvent('error', { text: err?.message || 'Processing failed' });
      res.end();
    }
  });

  // Mount Vite middleware in development or serve static build in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in development mode');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Server] Serving static production files from dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] SearchBot running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
