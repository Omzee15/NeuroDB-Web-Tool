import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUser";
import { getConnection } from "@/lib/db/connectionManager";
import { fetchErdSchema } from "@/lib/db/erdSchema";
import { explainQuery } from "@/lib/ai/generateSql";
import { getUserGeminiApiKey } from "@/lib/ai/userApiKey";

export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const query = body?.query as string | undefined;
  const connectionId = body?.connectionId as string | undefined;
  const schemaName = (body?.schema as string | undefined) || "public";

  if (!query || !connectionId) {
    return NextResponse.json({ error: "query and connectionId are required" }, { status: 400 });
  }

  const conn = getConnection(auth.userId, connectionId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  const [schema, userApiKey] = await Promise.all([
    fetchErdSchema(conn.pool, schemaName),
    getUserGeminiApiKey(auth.userId),
  ]);
  const result = await explainQuery(query, schema, userApiKey);
  if (!result.success) {
    return NextResponse.json(result, { status: result.errorType === "quota_exhausted" ? 429 : 400 });
  }
  return NextResponse.json(result);
}
