import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config';
import { PlatformIntegrationService } from './services/platformIntegration';
import { MedusaCommerceAdapter } from './services/medusa';
import { createTenantMiddleware } from './middleware/tenant';
import { registerStoreRoutes } from './routes/store';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(express.json({ limit: '10mb' }));

  const platformService = new PlatformIntegrationService(
    env.PLATFORM_API_URL,
    env.INTERNAL_PLATFORM_TOKEN,
  );

  const medusaAdapter = new MedusaCommerceAdapter(
    env.MEDUSA_API_URL,
    env.MEDUSA_API_KEY,
  );

  const tenantGuard = createTenantMiddleware(platformService, env.JWT_SECRET);

  const apiRouter = express.Router();
  apiRouter.use(tenantGuard);
  registerStoreRoutes(apiRouter, medusaAdapter);

  app.use('/api/v1', apiRouter);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  });

  app.use((err: Error, _req: any, res: any, _next: any) => {
    console.error('[Global Error]', err.message);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  });

  return app;
}
