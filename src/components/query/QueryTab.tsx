"use client";

import { useEffect, useRef, useState } from "react";
import { useConnections } from "@/contexts/ConnectionContext";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { useQueryExecution } from "@/hooks/useQueryExecution";
import { AiPromptBar } from "@/components/query/AiPromptBar";
import { QuickFilter } from "@/components/query/QuickFilter";
import { QueryEditor } from "@/components/query/QueryEditor";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { ColumnInfo } from "@/types/api";

interface QueryTabProps {
  selectedTable: { schema: string; name: string; type: "table" | "view" } | null;
  onClearSelectedTable: () => void;
}

export function QueryTab({ selectedTable, onClearSelectedTable }: QueryTabProps) {
  const { activeConnectionId } = useConnections();
  const { pushAssistantMessage } = useAiPanel();
  const [sql, setSql] = useState("");
  const [limit, setLimit] = useState<string>("100");
  const [tableColumns, setTableColumns] = useState<ColumnInfo[] | null>(null);
  const [explaining, setExplaining] = useState(false);
  const { result, error, executing, execute } = useQueryExecution();
  const lastLoadedTable = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedTable || !activeConnectionId) return;
    const key = `${selectedTable.schema}.${selectedTable.name}`;
    if (lastLoadedTable.current === key) return;
    lastLoadedTable.current = key;

    const defaultLimit = limit === "all" ? "" : ` LIMIT ${limit}`;
    setSql(`SELECT *\nFROM "${selectedTable.schema}"."${selectedTable.name}"${defaultLimit};`);

    if (selectedTable.type === "table") {
      fetch(
        `/api/schema/columns?connectionId=${activeConnectionId}&schema=${encodeURIComponent(
          selectedTable.schema
        )}&table=${encodeURIComponent(selectedTable.name)}`
      )
        .then((r) => r.json())
        .then((data) => setTableColumns(data.columns ?? null));
    } else {
      setTableColumns(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, activeConnectionId]);

  function runQuery(queryText: string) {
    if (!activeConnectionId) return;
    execute(activeConnectionId, queryText);
  }

  function handleExecute() {
    runQuery(sql);
  }

  async function handleExplain() {
    if (!activeConnectionId || !sql.trim() || explaining) return;
    setExplaining(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql, connectionId: activeConnectionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        pushAssistantMessage(data.explanation);
      } else {
        pushAssistantMessage(`Error: ${data.error || "Failed to explain query"}`);
      }
    } catch (err) {
      pushAssistantMessage(`Error: ${err instanceof Error ? err.message : "Failed to explain query"}`);
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="query-section">
      <div className="main-tab-content active">
        <AiPromptBar onGenerated={(generatedSql) => setSql(generatedSql)} currentSql={sql} />

        {selectedTable && selectedTable.type === "table" && tableColumns && (
          <QuickFilter
            tableName={`${selectedTable.schema}.${selectedTable.name}`}
            columns={tableColumns}
            limit={limit}
            onClose={onClearSelectedTable}
            onApply={(generatedSql) => {
              setSql(generatedSql);
              runQuery(generatedSql);
            }}
          />
        )}

        <QueryEditor
          value={sql}
          onChange={setSql}
          onExecute={handleExecute}
          executing={executing}
          limit={limit}
          onLimitChange={setLimit}
          onExplain={handleExplain}
          explaining={explaining}
        />

        <ResultsPanel result={result} error={error} executing={executing} />
      </div>
    </div>
  );
}
