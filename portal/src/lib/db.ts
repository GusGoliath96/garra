import { Pool, type QueryResultRow } from "pg";

// Um pool por processo (sobrevive ao hot reload do `next dev`).
const g = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  g.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") g.__pgPool = pool;

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
