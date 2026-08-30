import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { getConnection } from "@/lib/db/connectionManager";
import { fetchErdSchema } from "@/lib/db/erdSchema";

export async function GET(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const schema = searchParams.get("schema") || "public";

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const conn = getConnection(auth.userId, connectionId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  try {
    const result = await fetchErdSchema(conn.pool, schema);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
