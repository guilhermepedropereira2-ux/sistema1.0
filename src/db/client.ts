import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

let poolInstance: pg.Pool | null = null;

export function resolveDatabaseUrl(rawUrl?: string): string {
  const url = (rawUrl || process.env.DATABASE_URL || "").trim();
  return url;
}

export function getDbPool(): pg.Pool | null {
  if (poolInstance) return poolInstance;

  const rawUrl = process.env.DATABASE_URL;
  const connectionString = resolveDatabaseUrl(rawUrl);

  if (!connectionString) {
    return null;
  }

  try {
    poolInstance = new pg.Pool({
      connectionString,
      ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]:", err.message);
    });

    return poolInstance;
  } catch (err: any) {
    console.warn("[PostgreSQL] Erro ao instanciar pool:", err.message);
    return null;
  }
}

export async function testConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  const pool = getDbPool();
  if (!pool) {
    return { ok: false, message: "DATABASE_URL não configurada. Operando em modo de memória local." };
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
