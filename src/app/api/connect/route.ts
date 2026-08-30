import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { addConnection, listConnections, removeConnection, ConnectionConfig } from "@/lib/db/connectionManager";

// Lists *live* (currently connected, in-memory) connections for this user.
// Saved connection records (persisted in the app DB) live under /api/connections.
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ connections: listConnections(auth.userId) });
}

// Opens a new live connection (does not persist it — use /api/connections to save it).
export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as Partial<ConnectionConfig>;

  const useConnectionString = typeof body.connectionString === "string" && body.connectionString.trim().length > 0;

  if (!useConnectionString) {
    if (!body.host || !body.database || !body.user) {
      return NextResponse.json({ error: "host, database, and user are required" }, { status: 400 });
    }
  }

  const config: ConnectionConfig = {
    name: body.name?.trim() || body.database || "Connection",
    host: body.host ?? "",
    port: body.port ?? 5432,
    user: body.user ?? "",
    password: body.password ?? "",
    database: body.database ?? "",
    ssl: !!body.ssl,
    connectionString: useConnectionString ? body.connectionString : undefined,
  };

  const result = await addConnection(auth.userId, config);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.id, connections: listConnections(auth.userId) });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("id");
  if (!connectionId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const removed = await removeConnection(auth.userId, connectionId);
  if (!removed) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, connections: listConnections(auth.userId) });
}
