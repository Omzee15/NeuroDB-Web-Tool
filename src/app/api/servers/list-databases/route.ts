import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { listDatabasesOnServer } from "@/lib/db/connectionManager";

// Lists the databases that exist on a PostgreSQL server, so the user can pick
// which ones to register. Accepts either:
//   { serverId }                             -> use a saved server's credentials
//   { host, port, user, password, ssl }      -> ad-hoc (new server, not saved yet)
//   { connectionString, ssl }
// Response also includes `existing`: names already registered (for a saved server).
export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  let config;
  let existing: string[] = [];

  if (body.serverId) {
    const server = await prisma.savedServer.findUnique({
      where: { id: body.serverId },
      include: { databases: { select: { name: true } } },
    });
    if (!server || server.userId !== auth.userId) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    existing = server.databases.map((d) => d.name);
    config = {
      name: server.name,
      host: server.host,
      port: server.port,
      user: server.databaseUser,
      password: server.password,
      database: "postgres",
      ssl: server.ssl,
      connectionString: server.connectionString ?? undefined,
    };
  } else {
    const useConnectionString =
      typeof body.connectionString === "string" && body.connectionString.trim().length > 0;
    if (!useConnectionString && (!body.host || !body.user)) {
      return NextResponse.json({ error: "host and user are required" }, { status: 400 });
    }
    config = {
      name: body.name?.trim() || body.host || "Server",
      host: body.host ?? "",
      port: body.port ?? 5432,
      user: body.user ?? "",
      password: body.password ?? "",
      database: "postgres",
      ssl: !!body.ssl,
      connectionString: useConnectionString ? body.connectionString.trim() : undefined,
    };
  }

  const result = await listDatabasesOnServer(config);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ databases: result.databases, existing });
}
