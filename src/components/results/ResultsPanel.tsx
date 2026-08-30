"use client";

import { useMemo, useState } from "react";
import { Eye, Download, ChevronDown, FileJson, FileText } from "lucide-react";
import { QueryResultData } from "@/types/api";
import { exportRows } from "@/lib/export/exportResults";

interface ResultsPanelProps {
  result: QueryResultData | null;
  error: string | null;
  executing: boolean;
}

export function ResultsPanel({ result, error, executing }: ResultsPanelProps) {
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("");
  const [highlight, setHighlight] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  const fields = result?.fields ?? [];

  const visibleRows = useMemo(() => {
    if (!result) return [];
    let rows = result.rows;

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((row) => {
        if (searchColumn) {
          const val = row[searchColumn];
          return val != null && String(val).toLowerCase().includes(term);
        }
        return fields.some((f) => {
          const val = row[f];
          return val != null && String(val).toLowerCase().includes(term);
        });
      });
    }

    if (sortColumn) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortColumn];
        const bv = b[sortColumn];
        const an = parseFloat(String(av));
        const bn = parseFloat(String(bv));
        let cmp: number;
        if (!isNaN(an) && !isNaN(bn)) {
          cmp = an - bn;
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" });
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, search, searchColumn, sortColumn, sortOrder]);

  function renderCell(value: unknown, term: string) {
    const text = value === null || value === undefined ? "NULL" : typeof value === "object" ? JSON.stringify(value) : String(value);
    if (!term) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="search-highlight">{text.slice(idx, idx + term.length)}</span>
        {text.slice(idx + term.length)}
      </>
    );
  }

  function toggleColumn(field: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  const visibleFields = fields.filter((f) => !hiddenColumns.has(f));

  return (
    <div className="results-container">
      <div className="results-header">
        <div>
          <h4>Results</h4>
          <div className="results-info">
            {executing
              ? "Executing..."
              : error
              ? "Error"
              : result
              ? `${visibleRows.length === result.rowCount ? result.rowCount : `${visibleRows.length} of ${result.rowCount}`} rows in ${result.executionTimeMs}ms`
              : ""}
          </div>
        </div>

        {result && result.rows.length > 0 && (
          <div className="results-search">
            <div className="search-group">
              <label className="search-label">Filter:</label>
              <select className="search-column-select" value={searchColumn} onChange={(e) => setSearchColumn(e.target.value)}>
                <option value="">All Columns</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="search-input"
                placeholder="Filter results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="search-group">
              <label className="search-label">Highlight:</label>
              <input
                type="text"
                className="search-input highlight-input"
                placeholder="Highlight text..."
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
              />
            </div>

            <select className="sort-column-select" value={sortColumn} onChange={(e) => setSortColumn(e.target.value)}>
              <option value="">Sort by...</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select className="sort-order-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            <div className="columns-visibility-dropdown">
              <button className="btn-secondary columns-visibility-btn" onClick={() => setColumnsMenuOpen((v) => !v)}>
                <Eye />
                Show/Hide
              </button>
              {columnsMenuOpen && (
                <div className="columns-visibility-menu">
                  <div className="columns-visibility-header">Column Visibility</div>
                  <div className="columns-visibility-list">
                    {fields.map((f) => (
                      <label key={f} className="column-visibility-item">
                        <input
                          type="checkbox"
                          className="column-visibility-checkbox"
                          checked={!hiddenColumns.has(f)}
                          onChange={() => toggleColumn(f)}
                        />
                        <span className="column-visibility-label">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && result.rows.length > 0 && (
          <div className="export-dropdown-container">
            <ExportMenu rows={result.rows} />
          </div>
        )}
      </div>

      <div className="results-table-container">
        {executing && <div className="no-results">Executing...</div>}
        {!executing && error && (
          <div className="no-results" style={{ color: "var(--error)" }}>
            Error: {error}
          </div>
        )}
        {!executing && !error && !result && <div className="no-results">Execute a query to see results</div>}
        {!executing && !error && result && result.rows.length === 0 && (
          <div className="no-results">Query executed successfully. {result.command} completed.</div>
        )}
        {!executing && !error && result && result.rows.length > 0 && (
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                {visibleFields.map((f) => (
                  <th key={f}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {visibleFields.map((f) => (
                    <td key={f}>{renderCell(row[f], highlight)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExportMenu({ rows }: { rows: Record<string, unknown>[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className={`export-dropdown-btn ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <Download />
        Export
        <ChevronDown className="dropdown-arrow" />
      </button>
      {open && (
        <div className="export-dropdown-menu">
          <button
            className="export-dropdown-item"
            onClick={() => {
              exportRows(rows, "json");
              setOpen(false);
            }}
          >
            <FileJson />
            JSON
          </button>
          <button
            className="export-dropdown-item"
            onClick={() => {
              exportRows(rows, "csv");
              setOpen(false);
            }}
          >
            <FileText />
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
