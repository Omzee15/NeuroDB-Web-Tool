"use client";

import { useMemo, useState } from "react";
import { RefreshCw, ChevronRight, Table2, Eye, Search } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";
import { SchemaTreeEntry } from "@/types/api";

interface DbTreeProps {
  connectionId: string;
  onSelectTable: (table: { schema: string; name: string; type: "table" | "view" } | null) => void;
  width?: number;
}

export function DbTree({ onSelectTable, width }: DbTreeProps) {
  const { schemaTree, schemaLoading, refreshSchema } = useConnections();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ public: true });

  const filtered = useMemo(() => {
    if (!schemaTree) return null;
    const term = search.trim().toLowerCase();
    if (!term) return schemaTree.tree;

    const result: typeof schemaTree.tree = {};
    for (const [schema, entry] of Object.entries(schemaTree.tree)) {
      const tables = entry.tables.filter((t) => t.name.toLowerCase().includes(term));
      const views = entry.views.filter((v) => v.name.toLowerCase().includes(term));
      if (tables.length || views.length) {
        result[schema] = { tables, views };
      }
    }
    return result;
  }, [schemaTree, search]);

  function toggle(schema: string) {
    setExpanded((prev) => ({ ...prev, [schema]: !prev[schema] }));
  }

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  function renderEntry(entry: SchemaTreeEntry) {
    const key = `${entry.schema}.${entry.name}.${entry.type}`;
    return (
      <div
        key={key}
        className={`tree-item ${selectedKey === key ? "selected" : ""}`}
        onClick={() => {
          setSelectedKey(key);
          onSelectTable({ schema: entry.schema, name: entry.name, type: entry.type });
        }}
      >
        {entry.type === "view" ? <Eye size={13} /> : <Table2 size={13} />}
        {entry.name}
      </div>
    );
  }

  return (
    <div className="db-browser" style={width ? { width } : undefined}>
      <div className="db-browser-header">
        <h3>Database Browser</h3>
        <button className="btn-icon" title="Refresh Schema" onClick={() => refreshSchema()}>
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="db-search-container">
        <input
          type="text"
          className="db-search-input"
          placeholder="Search tables and views..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="db-search-icon" size={14} />
      </div>
      <div className="db-tree">
        {schemaLoading && <div className="db-tree-loading">Loading schema...</div>}
        {!schemaLoading && filtered && Object.keys(filtered).length === 0 && (
          <div className="db-tree-empty">No tables found</div>
        )}
        {!schemaLoading &&
          filtered &&
          Object.entries(filtered).map(([schema, entry]) => (
            <div key={schema}>
              <div className="tree-item" onClick={() => toggle(schema)}>
                <ChevronRight
                  size={14}
                  style={{
                    transition: "transform 0.15s ease",
                    transform: expanded[schema] !== false ? "rotate(90deg)" : "none",
                  }}
                />
                {schema}
              </div>
              {expanded[schema] !== false && (
                <div className="tree-children">
                  {entry.tables.map(renderEntry)}
                  {entry.views.map(renderEntry)}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
