import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

let poolInstance: pg.Pool | null = null;

export const DEFAULT_SUPABASE_URL =
  "postgresql://postgres.brnhqervmmqqcsedwvss:Joao%2F20%2F1234@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";

export function resolveDatabaseUrl(rawUrl?: string): string {
  const url = (rawUrl || process.env.DATABASE_URL || "").trim();

  // Se não foi informada URL, ou se for localhost/127.0.0.1 (não existe daemon local no container),
  // ou se for a referência ao projeto Supabase, utiliza o pooler IPv4 oficial do Supabase na AWS SA-East-1
  if (
    !url ||
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("barberflow") ||
    url.includes("brnhqervmmqqcsedwvss")
  ) {
    return DEFAULT_SUPABASE_URL;
  }

  return url;
}

export function getDbPool(): pg.Pool | null {
  if (poolInstance) return poolInstance;

  const rawUrl = process.env.DATABASE_URL;
  const connectionString = resolveDatabaseUrl(rawUrl);

  if (!connectionString) {
    console.warn("[PostgreSQL] No DATABASE_URL provided. Running in in-memory mode.");
    return null;
  }

  poolInstance = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

  poolInstance.on("error", (err) => {
    console.error("[PostgreSQL Pool Error]:", err.message);
  });

  return poolInstance;
}

export async function testConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  const pool = getDbPool();
  if (!pool) {
    return { ok: false, message: "DATABASE_URL not set" };
  }

  try {
    const client = await pool.connect();
    const res = await client.query(
      "SELECT NOW() as server_time, current_database() as database, version() as version;"
    );
    client.release();
    return {
      ok: true,
      message: "Conexão com PostgreSQL (Supabase) estabelecida com sucesso!",
      details: res.rows[0],
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Falha ao conectar no PostgreSQL: ${err.message}`,
      details: err,
    };
  }
}
