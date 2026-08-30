import { prisma } from "@/lib/db/prisma";

export async function getUserGeminiApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { geminiApiKey: true } });
  return user?.geminiApiKey ?? null;
}
