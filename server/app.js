import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import youtubeRoutes from './routes/youtube.js';
import projectRoutes from './routes/projects.js';
import scrapeRoutes from './routes/scrape.js';
import generateImageRoutes from './routes/generate-image.js';
import webSearchRoutes from './routes/web-search.js';
import { requireAuth } from './middleware/auth.js';

export function createApp() {
  const app = express();

  // Middleware
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '50mb' }));

  // Public routes (no auth required)
  app.use('/api/chat', chatRoutes);
  app.use('/api/youtube', youtubeRoutes);
  app.use('/api/scrape', scrapeRoutes);
  app.use('/api/web-search', webSearchRoutes);

  // Protected routes (auth required)
  app.use('/api/projects', requireAuth, projectRoutes);
  app.use('/api/upload', requireAuth, uploadRoutes);
  app.use('/api/generate-image', requireAuth, generateImageRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
