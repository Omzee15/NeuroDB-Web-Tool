import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";

// Adds one or more databases to an existing saved server.
// Body: { databases: string[] }  (or { name: string })
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { id: serverId } = await params;
  const server = await prisma.savedServer.findUnique({ where: { id: serverId } });
  if (!server || server.userId !== auth.userId) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const raw: unknown[] = Array.isArray(body?.databases)
    ? body.databases
    : body?.name
    ? [body.name]
    : [];
  const names = [...new Set(raw.map((d) => String(d).trim()).filter(Boolean))];

  if (names.length === 0) {
    return NextResponse.json({ error: "No database names provided" }, { status: 400 });
  }

  await prisma.savedDatabase.createMany({
    data: names.map((name) => ({ serverId, name })),
    skipDuplicates: true,
  });

  const databases = await prisma.savedDatabase.findMany({
    where: { serverId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ databases });
}

// Removes a database from a saved server. Query: ?databaseId=...
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { id: serverId } = await params;
  const { searchParams } = new URL(request.url);
  const databaseId = searchParams.get("databaseId");
  if (!databaseId) {
    return NextResponse.json({ error: "databaseId is required" }, { status: 400 });
  }

  const db = await prisma.savedDatabase.findUnique({
    where: { id: databaseId },
    include: { server: { select: { userId: true, id: true } } },
  });
  if (!db || db.server.id !== serverId || db.server.userId !== auth.userId) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  await prisma.savedDatabase.delete({ where: { id: databaseId } });
  return NextResponse.json({ ok: true });
}
