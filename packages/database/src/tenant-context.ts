import { Pool, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';
import { prisma, pgPool } from './client';

/**
 * Executes a PostgreSQL callback within a scoped transaction where
 * 'app.current_tenant_id' is set, enforcing Row-Level Security (RLS).
 */
export async function withTenantContext<T>(
  tenantId: string,
  operation: (client: PoolClient) => Promise<T>,
  pool: Pool = pgPool
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes a Prisma callback within an interactive transaction with
 * 'app.current_tenant_id' set for RLS policies.
 */
export async function withPrismaTenantContext<T>(
  tenantId: string,
  operation: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
    return await operation(tx);
  });
}
