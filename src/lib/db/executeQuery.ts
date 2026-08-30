import { Pool } from "pg";

export interface ExecuteResult {
  success: true;
  rows: Record<string, unknown>[];
  fields: string[];
  rowCount: number;
  executionTimeMs: number;
  command: string;
}

export interface ExecuteError {
  success: false;
  error: string;
}

export async function runQuery(pool: Pool, sql: string): Promise<ExecuteResult | ExecuteError> {
  const client = await pool.connect();
  const started = Date.now();
  try {
    const result = await client.query(sql);
    const executionTimeMs = Date.now() - started;
    return {
      success: true,
      rows: result.rows,
      fields: result.fields?.map((f) => f.name) ?? [],
      rowCount: result.rowCount ?? result.rows.length,
      executionTimeMs,
      command: result.command,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    client.release();
  }
}
