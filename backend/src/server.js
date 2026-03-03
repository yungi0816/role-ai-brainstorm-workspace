import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { getDatabase, initDatabase } from './db/database.js';
import chatRoutes from './routes/chatRoutes.js';
import mindmapRoutes from './routes/mindmapRoutes.js';
import providerRoutes from './routes/providerRoutes.js';

const PORT = Number(process.env.PORT || 4000);

function buildCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
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

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
}
