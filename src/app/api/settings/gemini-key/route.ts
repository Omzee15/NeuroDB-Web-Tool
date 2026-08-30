import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { geminiApiKey: true } });
  return NextResponse.json({ hasKey: !!user?.geminiApiKey });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: auth.userId }, data: { geminiApiKey: apiKey } });
  return NextResponse.json({ hasKey: true });
}

export async function DELETE() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  await prisma.user.update({ where: { id: auth.userId }, data: { geminiApiKey: null } });
  return NextResponse.json({ hasKey: false });
}
