import express from 'express';
import { apiRouter } from './routes.ts';

export const app = express();

// 1. Permissive CORS Middleware (enables cross-origin if frontend and API are hosted separately)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Request body parser
app.use(express.json());

// 3. Health check endpoints
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'KantinCep API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// 4. Mount API router on both '/api' and '/'
// This ensures routes work whether incoming requests arrive as /api/... or were rewritten to /...
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
