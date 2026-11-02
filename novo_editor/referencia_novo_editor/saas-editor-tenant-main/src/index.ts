import { env } from './config';
import { createApp } from './app';

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`🚀 Módulo de Catálogo SaaS unificado rodando na porta ${env.PORT}`);
  });
}

export default app;
