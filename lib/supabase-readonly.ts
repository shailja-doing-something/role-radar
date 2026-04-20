import { Pool } from "pg";
import { lookup } from "dns";
import { promisify } from "util";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set");
}

const dnsLookup = promisify(lookup);

// Resolve Supabase hostname to IPv4 before creating the pool.
// Railway cannot reach Supabase over IPv6 (ENETUNREACH).
async function buildPool(): Promise<Pool> {
  const url = new URL(process.env.SUPABASE_DB_URL!);
  try {
    const result = await dnsLookup(url.hostname, { family: 4 });
    url.hostname = (result as unknown as { address: string }).address;
  } catch {
    // fall back to original hostname
  }
  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
}

const poolPromise: Promise<Pool> = buildPool();

const FORBIDDEN = /^\s*(insert|update|delete|drop|alter|create|truncate|replace)/i;

// Safety wrapper — rejects any query containing write operations
export async function readonlyQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (FORBIDDEN.test(sql.trim())) {
    throw new Error("Write operations are not permitted on the Supabase read-only connection.");
  }
  const pool   = await poolPromise;
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export default poolPromise;
