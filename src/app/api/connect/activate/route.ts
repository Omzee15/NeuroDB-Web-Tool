import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { addConnection } from "@/lib/db/connectionManager";

// Opens a live in-memory pool for a registered database (SavedDatabase) using
// its parent server's credentials.
// Body: { databaseId }
export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const databaseId = body?.databaseId as string | undefined;
  if (!databaseId) {
    return NextResponse.json({ error: "databaseId is required" }, { status: 400 });
  }

  const db = await prisma.savedDatabase.findUnique({
    where: { id: databaseId },
    include: { server: true },
  });
  if (!db || db.server.userId !== auth.userId) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  const { server } = db;

  // A saved connection string points at one specific database; only reuse it
  // when it targets this database, otherwise connect by discrete fields.
  const useConnStr =
    !!server.connectionString && connStringDatabase(server.connectionString) === db.name;

  const result = await addConnection(auth.userId, {
    name: `${server.name} / ${db.name}`,
    host: server.host,
    port: server.port,
    user: server.databaseUser,
    password: server.password,
    database: db.name,
    ssl: server.ssl,
    connectionString: useConnStr ? server.connectionString! : undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.id });
}

function connStringDatabase(cs: string): string | null {
  try {
    const u = new URL(cs);
    return decodeURIComponent(u.pathname.replace(/^\//, "")) || null;
  } catch {
    return null;
  }
}
