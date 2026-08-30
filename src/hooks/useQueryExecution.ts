"use client";

import { useCallback, useState } from "react";
import { QueryResultData } from "@/types/api";

export interface QueryExecutionState {
  result: QueryResultData | null;
  error: string | null;
  executing: boolean;
  execute: (connectionId: string, sql: string) => Promise<void>;
}

export function useQueryExecution(): QueryExecutionState {
  const [result, setResult] = useState<QueryResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const execute = useCallback(async (connectionId: string, sql: string) => {
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Query failed");
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setResult(null);
    } finally {
      setExecuting(false);
    }
  }, []);

  return { result, error, executing, execute };
}
