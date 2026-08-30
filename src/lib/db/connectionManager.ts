import { Pool } from "pg";
import { randomUUID } from "crypto";

export interface ConnectionConfig {
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  connectionString?: string;
}

interface ManagedConnection {
  id: string;
  name: string;
  pool: Pool;
  config: Omit<ConnectionConfig, "password" | "connectionString">;
  createdAt: number;
  lastUsedAt: number;
}

// sessionId -> connectionId -> ManagedConnection
const sessions = new Map<string, Map<string, ManagedConnection>>();

// Idle sessions get swept so dead browser tabs don't leak live pg pools.
const SESSION_IDLE_MS = 1000 * 60 * 60 * 2; // 2h

function getSessionMap(sessionId: string): Map<string, ManagedConnection> {
  let map = sessions.get(sessionId);
  if (!map) {
    map = new Map();
    sessions.set(sessionId, map);
  }
  return map;
}

export function buildPoolConfig(config: ConnectionConfig) {
  if (config.connectionString) {
    return {
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    };
  }
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  };
}

// Connects to the server (via the `postgres` maintenance DB, or the given
// database / connection string) and returns the list of non-template databases.
export async function listDatabasesOnServer(
  config: ConnectionConfig
): Promise<{ ok: true; databases: string[] } | { ok: false; error: string }> {
  const poolConfig = config.connectionString
    ? buildPoolConfig(config)
    : { ...buildPoolConfig(config), database: config.database || "postgres" };

  const pool = new Pool({ ...poolConfig, max: 1 });
  try {
    const res = await pool.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    );
    return { ok: true, databases: res.rows.map((r) => r.datname) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function testConnection(config: ConnectionConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const pool = new Pool(buildPoolConfig(config));
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { ok: true };
    } finally {
      client.release();
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await pool.end();
  }
}

export async function addConnection(
  sessionId: string,
  config: ConnectionConfig
): Promise<{ id: string } | { error: string }> {
  const pool = new Pool(buildPoolConfig(config));

  try {
    const client = await pool.connect();
    client.release();
  } catch (err) {
    await pool.end();
    return { error: err instanceof Error ? err.message : String(err) };
  }

  const id = randomUUID();
  const map = getSessionMap(sessionId);
  map.set(id, {
    id,
    name: config.name || config.database,
    pool,
    config: {
      name: config.name,
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      ssl: config.ssl,
    },
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  });

  pool.on("error", (err) => {
    console.error(`[pg pool ${id}] idle client error`, err.message);
  });

  return { id };
}

export function getConnection(sessionId: string, connectionId: string): ManagedConnection | undefined {
  const conn = sessions.get(sessionId)?.get(connectionId);
  if (conn) conn.lastUsedAt = Date.now();
  return conn;
}

export function listConnections(sessionId: string) {
  const map = sessions.get(sessionId);
  if (!map) return [];
  return Array.from(map.values()).map((c) => ({
    id: c.id,
    name: c.name,
    config: c.config,
    createdAt: c.createdAt,
  }));
}

export async function removeConnection(sessionId: string, connectionId: string): Promise<boolean> {
  const map = sessions.get(sessionId);
  const conn = map?.get(connectionId);
  if (!conn) return false;
  await conn.pool.end().catch(() => {});
  map!.delete(connectionId);
  return true;
}

export async function removeSession(sessionId: string): Promise<void> {
  const map = sessions.get(sessionId);
  if (!map) return;
  await Promise.all(Array.from(map.values()).map((c) => c.pool.end().catch(() => {})));
  sessions.delete(sessionId);
}

// Periodic sweep of idle sessions (best-effort; process-lifetime only).
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, map] of sessions.entries()) {
    let newest = 0;
    for (const conn of map.values()) newest = Math.max(newest, conn.lastUsedAt);
    if (map.size > 0 && now - newest > SESSION_IDLE_MS) {
      removeSession(sessionId);
    }
  }
}, 1000 * 60 * 10).unref();
