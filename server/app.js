import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import youtubeRoutes from './routes/youtube.js';
import projectRoutes from './routes/projects.js';
import scrapeRoutes from './routes/scrape.js';
import generateImageRoutes from './routes/generate-image.js';
import webSearchRoutes from './routes/web-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Middleware
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '50mb' }));

  // Serve uploaded files statically
  const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));

  // API routes
  app.use('/api/chat', chatRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/youtube', youtubeRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/scrape', scrapeRoutes);
  app.use('/api/generate-image', generateImageRoutes);
  app.use('/api/web-search', webSearchRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
