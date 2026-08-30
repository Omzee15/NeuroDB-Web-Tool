import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";

const serverSelect = {
  id: true,
  name: true,
  host: true,
  port: true,
  databaseUser: true,
  ssl: true,
  connectionString: true,
  createdAt: true,
  databases: {
    select: { id: true, name: true, createdAt: true },
    orderBy: { name: "asc" as const },
  },
  // password intentionally omitted from list responses
} as const;

// Saved *servers* (host/port/credentials) with their registered databases.
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const servers = await prisma.savedServer.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
    select: serverSelect,
  });

  return NextResponse.json({ servers });
}

// Creates a saved server and registers the selected database(s) under it.
// Body: { name, host, port, user, password, ssl, connectionString?, databases: string[] }
export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const useConnectionString =
    typeof body?.connectionString === "string" && body.connectionString.trim().length > 0;

  if (!useConnectionString && (!body?.host || !body?.user)) {
    return NextResponse.json({ error: "host and user are required" }, { status: 400 });
  }

  const databases: string[] = Array.isArray(body?.databases)
    ? Array.from(
        new Set((body.databases as unknown[]).map((d) => String(d).trim()).filter((s) => s.length > 0))
      )
    : [];

  if (databases.length === 0) {
    return NextResponse.json({ error: "Select at least one database" }, { status: 400 });
  }

  const server = await prisma.savedServer.create({
    data: {
      userId: auth.userId,
      name: body.name?.trim() || body.host || "Server",
      host: body.host ?? "",
      port: body.port ?? 5432,
      databaseUser: body.user ?? "",
      password: body.password ?? "",
      ssl: !!body.ssl,
      connectionString: useConnectionString ? body.connectionString.trim() : null,
      databases: { create: databases.map((name) => ({ name })) },
    },
    select: serverSelect,
  });

  return NextResponse.json({ server });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.savedServer.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  await prisma.savedServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
