import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Global singleton PrismaClient instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Direct PostgreSQL pool for raw queries & pgvector hybrid search
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
