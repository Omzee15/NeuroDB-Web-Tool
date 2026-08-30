import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { getConnection } from "@/lib/db/connectionManager";
import { COLUMNS_QUERY } from "@/lib/db/queries";
import { ColumnInfo } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const schema = searchParams.get("schema");
  const table = searchParams.get("table");

  if (!connectionId || !schema || !table) {
    return NextResponse.json({ error: "connectionId, schema, and table are required" }, { status: 400 });
  }

  const conn = getConnection(auth.userId, connectionId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  try {
    const result = await conn.pool.query(COLUMNS_QUERY, [schema, table]);
    const columns: ColumnInfo[] = result.rows.map((r) => ({
      name: r.name,
      type: r.type,
      udt_name: r.udt_name,
      nullable: r.nullable,
      default_value: r.default_value,
      max_length: r.max_length,
      is_primary_key: !!r.is_primary_key,
    }));
    return NextResponse.json({ columns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
