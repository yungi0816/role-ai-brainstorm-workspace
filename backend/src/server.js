import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { pathToFileURL } from 'node:url';
import { getDatabase, initDatabase } from './db/database.js';
import chatRoutes from './routes/chatRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import mindmapRoutes from './routes/mindmapRoutes.js';
import providerRoutes from './routes/providerRoutes.js';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';

function buildCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS.'));
    }
  };
}

export function createApp() {
  initDatabase();

  const app = express();
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (req, res) => {
    const dbCheck = getDatabase().prepare('SELECT 1 AS ok').get();

    res.json({
      status: 'ok',
      service: 'role-ai-brainstorm-backend',
      database: dbCheck.ok === 1 ? 'connected' : 'unknown'
    });
  });

  app.use('/api/chat', chatRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/mindmap', mindmapRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.'
      }
    });
  });

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Unexpected server error.'
      }
    });
  });

  return app;
}

export function startServer({ port = PORT, host = HOST } = {}) {
  const app = createApp();
  return app.listen(port, host, () => {
    console.log(`Backend API listening on http://${host}:${port}`);
  });
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (process.env.NODE_ENV !== 'test' && isDirectRun()) {
  startServer();
}
