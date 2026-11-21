/**
 * Gemini Media Aggregator — server entry point.
 *
 * Thin wiring layer. Route groups live in:
 *   server/security.ts   — security headers + per-IP rate limiting
 *   server/ollamaProxy.ts — Ollama tunnel proxy (/api/ollama/*)
 *   server/gemini.ts     — Gemini routes + custom-AI / architecture routers
 *   server/crypto.ts     — Crypto/news routes (/api/crypto/*)
 *   server/maggiRoutes.ts — MAGGI RAG engine (/api/maggi/*)
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createMaggiRouter } from './server/maggiRoutes';
import { createOllamaRouter } from './server/ollamaProxy';
import { createGeminiRouter, createCustomAiRouter, createArchitectureRouter } from './server/gemini';
import { createCryptoRouter } from './server/crypto';
import { securityHeaders, rateLimiter } from './server/security';

const app = express();

// Trust one reverse proxy (tunnel/ingress) so req.ip is meaningful.
app.set('trust proxy', 1);

// Security headers on every response + disable x-powered-by early.
app.disable('x-powered-by');
app.use(securityHeaders());

app.use(express.json({ limit: '50mb' }));

// Rate limiting. Expensive AI routes get a tighter budget than cheap reads.
const expensiveLimiter = rateLimiter({ windowMs: 60_000, max: 30, message: 'Too many AI requests — slow down.' });
const newsLimiter = rateLimiter({ windowMs: 60_000, max: 30, message: 'Too many news requests.' });
const apiLimiter = rateLimiter({ windowMs: 60_000, max: 120, message: 'Too many requests.' });

// MAGGI RAG engine routes (chat/embeddings/extraction). Mounted before Vite so
// the dev middleware never swallows them.
app.use('/api/maggi', rateLimiter({ windowMs: 60_000, max: 60, message: 'Too many MAGGI requests.' }), createMaggiRouter());

// Ollama tunnel proxy.
app.use('/api/ollama', rateLimiter({ windowMs: 60_000, max: 40, message: 'Too many Ollama requests.' }), createOllamaRouter());

// Gemini routes (expensive AI calls).
app.use('/api/gemini', expensiveLimiter, createGeminiRouter());

// Custom OpenAI-compatible proxy (expensive — same budget as Gemini).
app.use('/api/custom-ai', expensiveLimiter, createCustomAiRouter());

// Crypto routes (prices/coin-info/ohlc/sek-rate/news) with a news-tight budget.
app.use('/api/crypto', newsLimiter, createCryptoRouter());

// Read-only architecture document (cheap).
app.use('/api/architecture', apiLimiter, createArchitectureRouter());

// Vite Middleware for Dev / Static Files for Prod
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});
