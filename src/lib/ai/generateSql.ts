import { GoogleGenerativeAI } from "@google/generative-ai";
import { formatSchemaForPrompt } from "./schemaFormat";
import { ErdSchema } from "@/types";

const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_PROMPT_TEMPLATE = (schemaText: string) => `You are an expert PostgreSQL assistant. Your task is to generate SQL statements based on user requests.

${schemaText}

Rules:
1. Generate ONLY valid PostgreSQL SQL statements (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE, etc.)
2. Use the EXACT table and column names from the schema, preserving case sensitivity (uppercase/lowercase)
3. NEVER change the case of table names or column names - use them exactly as shown in the schema
4. **CRITICAL QUOTING RULE**: Any identifier (schema, table, column) containing UPPERCASE letters or special characters MUST be enclosed in double quotes ("")
   - Example: "UserProfile", "firstName", "OrderID"
   - Lowercase-only identifiers do NOT need quotes: users, email, id
5. Include appropriate JOINs when querying multiple tables
6. Add WHERE clauses for filtering when mentioned
7. Use proper formatting and indentation
8. Return ONLY the SQL statement, no explanations or markdown
9. For SELECT queries, always specify column names (avoid SELECT *)
10. For ALTER TABLE operations, use proper PostgreSQL syntax
11. For data type changes, consider PostgreSQL-specific types (UUID, JSONB, TIMESTAMP, etc.)
12. Use table aliases for better readability in complex queries
13. Add appropriate ORDER BY clauses when relevant for SELECT statements
14. Consider performance implications and constraints
15. For DDL operations (CREATE, ALTER, DROP), ensure proper syntax and data types
16. CRITICAL: ALWAYS complete the entire SQL query - never stop mid-statement or mid-column list
17. CRITICAL: Ensure all SELECT column lists are complete with proper commas and closing
18. CRITICAL: Ensure all parentheses are properly closed
19. CRITICAL: End every statement with a semicolon (;)

Examples of supported operations:
- SELECT queries with JOINs, WHERE, ORDER BY, GROUP BY
- INSERT statements with proper value formatting
- UPDATE statements with WHERE conditions
- DELETE statements with WHERE conditions
- CREATE TABLE with proper constraints and data types
- ALTER TABLE to add, modify, or drop columns
- CREATE INDEX for performance optimization
- Any other valid PostgreSQL DDL or DML operation

QUOTING EXAMPLES (MANDATORY):
- Table "UserProfile" with column "firstName":
  CORRECT: SELECT "firstName" FROM "UserProfile";
  WRONG: SELECT firstName FROM UserProfile;

- Schema "MySchema" with table "Orders":
  CORRECT: SELECT * FROM "MySchema"."Orders";
  WRONG: SELECT * FROM MySchema.Orders;

- Mixed case: table "users" (lowercase) with column "createdAt" (has uppercase):
  CORRECT: SELECT "createdAt" FROM users;
  WRONG: SELECT createdAt FROM users;

If the request is unclear or cannot be fulfilled with the available schema, return an error message starting with "ERROR:".`;

export interface GenerateSqlResult {
  success: true;
  query: string;
}
export interface GenerateSqlError {
  success: false;
  error: string;
  errorType?: "quota_exhausted";
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|quota|rate limit|too many requests/i.test(msg);
}

function detectIncompleteSQL(sql: string): boolean {
  const trimmed = sql.trim();
  if (!trimmed) return true;
  if (/[,(]\s*$/.test(trimmed)) return true;
  if (/\b(JOIN|WHERE|AND|OR|AS)\s*$/i.test(trimmed)) return true;
  const openParens = (trimmed.match(/\(/g) ?? []).length;
  const closeParens = (trimmed.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) return true;
  if (/^\s*select\b/i.test(trimmed) && !/\bfrom\b/i.test(trimmed)) return true;
  return false;
}

const NO_KEY_ERROR =
  "AI is not configured. Add your own Gemini API key in Settings, or ask the admin to configure one for the server.";

function getClient(userApiKey?: string | null): GoogleGenerativeAI | null {
  const key = userApiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export async function generateSql(
  prompt: string,
  schema: ErdSchema,
  userApiKey?: string | null
): Promise<GenerateSqlResult | GenerateSqlError> {
  const client = getClient(userApiKey);
  if (!client) {
    return { success: false, error: NO_KEY_ERROR };
  }

  const schemaText = formatSchemaForPrompt(schema);
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE(schemaText);

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    const result = await model.generateContent(prompt);
    let sql = result.response.text().trim();
    sql = sql.replace(/```sql\n?/g, "").replace(/```\n?/g, "").trim();

    if (sql.toUpperCase().startsWith("ERROR:")) {
      return { success: false, error: sql.slice(6).trim() };
    }
    if (detectIncompleteSQL(sql)) {
      return { success: false, error: "The generated SQL appears to be incomplete. Try rephrasing your request." };
    }

    return { success: true, query: sql };
  } catch (err) {
    if (isQuotaError(err)) {
      return {
        success: false,
        errorType: "quota_exhausted",
        error:
          "The AI model is running busy right now — the free usage limit has been reached. Please try again shortly.",
      };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  message: string,
  schema: ErdSchema,
  connectionName: string,
  history: ChatMessage[],
  userApiKey?: string | null
): Promise<{ success: true; response: string } | GenerateSqlError> {
  const client = getClient(userApiKey);
  if (!client) {
    return { success: false, error: NO_KEY_ERROR };
  }

  const schemaText = formatSchemaForPrompt(schema);
  const systemPrompt = `You are the NeuroDB AI Assistant, an expert on PostgreSQL and the currently connected database "${connectionName}". Help the user with SQL queries, explain database concepts, and answer questions about their schema. Be concise and practical.\n\n${schemaText}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
    });

    const chatSession = model.startChat({
      history: history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    });

    const result = await chatSession.sendMessage(message);
    return { success: true, response: result.response.text().trim() };
  } catch (err) {
    if (isQuotaError(err)) {
      return {
        success: false,
        errorType: "quota_exhausted",
        error: "The AI model is running busy right now — the free usage limit has been reached. Please try again shortly.",
      };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function explainQuery(
  query: string,
  schema: ErdSchema,
  userApiKey?: string | null
): Promise<{ success: true; explanation: string } | GenerateSqlError> {
  const client = getClient(userApiKey);
  if (!client) {
    return { success: false, error: NO_KEY_ERROR };
  }

  const schemaText = formatSchemaForPrompt(schema);
  const systemPrompt = `You are an expert PostgreSQL assistant. Explain the following SQL query in plain language, in 3-4 sentences maximum. Cover: what it does, the key tables/conditions involved, and the expected output. Only mention performance if it's critical.\n\n${schemaText}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    });
    const result = await model.generateContent(query);
    return { success: true, explanation: result.response.text().trim() };
  } catch (err) {
    if (isQuotaError(err)) {
      return {
        success: false,
        errorType: "quota_exhausted",
        error: "The AI model is running busy right now — the free usage limit has been reached. Please try again shortly.",
      };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
