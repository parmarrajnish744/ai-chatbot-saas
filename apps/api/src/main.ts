import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { buildApp } from './app';

async function bootstrap() {
  const app = buildApp();
  const port = Number(process.env.PORT) || 4000;
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`🚀 API Server running at http://localhost:${port}`);
    console.log(`📋 Health check available at http://localhost:${port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
