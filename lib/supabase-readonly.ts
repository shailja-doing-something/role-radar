import { Pool } from "pg";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set");
}

// Read-only connection pool — SELECT queries only
const supabaseReadonly = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const FORBIDDEN = /^\s*(insert|update|delete|drop|alter|create|truncate|replace)/i;

// Safety wrapper — rejects any query containing write operations
export async function readonlyQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (FORBIDDEN.test(sql.trim())) {
    throw new Error("Write operations are not permitted on the Supabase read-only connection.");
  }
  const client = await supabaseReadonly.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export default supabaseReadonly;
