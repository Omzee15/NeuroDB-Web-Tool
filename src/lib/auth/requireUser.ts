import { NextResponse } from "next/server";
import { getSessionUserId } from "./session";

export async function requireUserId(): Promise<{ userId: string } | { error: NextResponse }> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { userId };
}
