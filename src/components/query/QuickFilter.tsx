"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { ColumnInfo as ApiColumnInfo } from "@/types/api";
import { quoteIdentifierIfNeeded } from "@/lib/sql/quoteIdentifier";

const OPERATORS = ["=", "!=", "<", "<=", ">", ">=", "LIKE", "ILIKE", "IN", "NOT IN", "IS NULL", "IS NOT NULL"];

interface QuickFilterProps {
  tableName: string; // "schema.table"
  columns: ApiColumnInfo[];
  limit: string;
  onClose: () => void;
  onApply: (sql: string) => void;
}

interface Row {
  id: number;
  logic: "AND" | "OR";
  column: string;
  operator: string;
  value: string;
}

export function QuickFilter({ tableName, columns, limit, onClose, onApply }: QuickFilterProps) {
  const [rows, setRows] = useState<Row[]>([{ id: 0, logic: "AND", column: "", operator: "=", value: "" }]);
  const [nextId, setNextId] = useState(1);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  function addRow() {
    setRows((prev) => [...prev, { id: nextId, logic: "AND", column: "", operator: "=", value: "" }]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function valuePlaceholder(operator: string) {
    if (operator === "IN" || operator === "NOT IN") return "Enter comma-separated values...";
    if (operator === "LIKE" || operator === "ILIKE") return "Enter pattern (use % for wildcard)...";
    return "Enter value...";
  }

  function generateSql(): string | null {
    const [schema, table] = tableName.split(".");
    const conditions: { logic: "AND" | "OR"; condition: string }[] = [];

    for (const row of rows) {
      const isNullOp = row.operator === "IS NULL" || row.operator === "IS NOT NULL";
      if (!row.column) continue;
      if (!isNullOp && !row.value.trim()) continue;

      const col = quoteIdentifierIfNeeded(row.column);
      let condition: string;

      if (isNullOp) {
        condition = `${col} ${row.operator}`;
      } else if (row.operator === "IN" || row.operator === "NOT IN") {
        const values = row.value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => `'${v.replace(/'/g, "''")}'`)
          .join(", ");
        condition = `${col} ${row.operator} (${values})`;
      } else if (row.operator === "LIKE" || row.operator === "ILIKE") {
        condition = `${col} ${row.operator} '${row.value.replace(/'/g, "''")}'`;
      } else {
        const numeric = !isNaN(Number(row.value)) && row.value.trim() !== "";
        const val = numeric ? row.value : `'${row.value.replace(/'/g, "''")}'`;
        condition = `${col} ${row.operator} ${val}`;
      }

      conditions.push({ logic: row.logic, condition });
    }

    if (conditions.length === 0) return null;

    const columnList = columns.map((c) => `  ${quoteIdentifierIfNeeded(c.name)}`).join(",\n");
    let whereClause = conditions[0].condition;
    for (let i = 1; i < conditions.length; i++) {
      whereClause += `\n  ${conditions[i].logic} ${conditions[i].condition}`;
    }

    let sql = `SELECT\n${columnList}\nFROM "${schema}"."${table}"\nWHERE ${whereClause}`;
    if (sortColumn) {
      sql += `\nORDER BY ${quoteIdentifierIfNeeded(sortColumn)} ${sortOrder.toUpperCase()}`;
    }
    if (limit !== "all") {
      sql += `\nLIMIT ${limit}`;
    }
    return sql + ";";
  }

  function handleApply() {
    const sql = generateSql();
    if (sql) onApply(sql);
  }

  return (
    <div className="where-clause-builder">
      <div className="where-builder-header">
        <span className="where-builder-title">
          Quick Filter: <span>{tableName}</span>
        </span>
        <button className="btn-icon" title="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div onKeyDown={(e) => e.key === "Enter" && handleApply()}>
        {rows.map((row, idx) => (
          <div key={row.id} className="filter-row">
            {idx > 0 && (
              <select
                className="filter-logic-select"
                value={row.logic}
                onChange={(e) => updateRow(row.id, { logic: e.target.value as "AND" | "OR" })}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}
            <select
              className="where-dropdown column-select"
              value={row.column}
              onChange={(e) => updateRow(row.id, { column: e.target.value })}
            >
              <option value="">Select Column</option>
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            <select
              className="where-dropdown operator-select"
              value={row.operator}
              onChange={(e) => updateRow(row.id, { operator: e.target.value })}
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {row.operator !== "IS NULL" && row.operator !== "IS NOT NULL" && (
              <input
                type="text"
                className="where-input value-input"
                placeholder={valuePlaceholder(row.operator)}
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
              />
            )}
            {idx === 0 ? (
              <button className="btn-secondary btn-add-filter" title="Add another filter" onClick={addRow}>
                <Plus size={14} />
                Add Filter
              </button>
            ) : (
              <button className="btn-remove-filter" title="Remove filter" onClick={() => removeRow(row.id)}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="where-builder-actions">
        <div className="where-builder-controls">
          <label className="where-sort-label">Sort:</label>
          <select className="where-dropdown where-sort-column" value={sortColumn} onChange={(e) => setSortColumn(e.target.value)}>
            <option value="">None</option>
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="where-dropdown where-sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          >
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleApply}>
          Filter
        </button>
      </div>
    </div>
  );
}
