import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { getConnection } from "@/lib/db/connectionManager";
import { SCHEMAS_QUERY, TABLES_AND_VIEWS_QUERY, COLUMNS_QUERY } from "@/lib/db/queries";
import { ColumnInfo, TableInfo } from "@/types";

// Returns the full schema tree for the sidebar: schemas -> tables/views -> columns.
export async function GET(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const conn = getConnection(auth.userId, connectionId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  const client = await conn.pool.connect();
  try {
    const schemasResult = await client.query<{ schema_name: string }>(SCHEMAS_QUERY);
    const schemas = schemasResult.rows.map((r) => r.schema_name);

    const tree: Record<string, { tables: TableInfo[]; views: TableInfo[] }> = {};

    for (const schema of schemas) {
      const tablesResult = await client.query(TABLES_AND_VIEWS_QUERY, [schema]);
      const tables: TableInfo[] = [];
      const views: TableInfo[] = [];
      for (const row of tablesResult.rows as { schema: string; name: string; type: string }[]) {
        const entry: TableInfo = { schema: row.schema, name: row.name, type: row.type === "VIEW" ? "view" : "table" };
        (entry.type === "view" ? views : tables).push(entry);
      }
      tree[schema] = { tables, views };
    }

    return NextResponse.json({ schemas, tree });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
