"use client";

import { useMemo, useRef, useState, WheelEvent, MouseEvent as ReactMouseEvent, useEffect } from "react";
import { Plus, Minus, RotateCcw, Table2 } from "lucide-react";
import { ErdSchema } from "@/types";

const TABLE_WIDTH = 260;
const ROW_HEIGHT = 26;
const HEADER_HEIGHT = 38;
const H_GAP = 80;
const V_GAP = 60;

interface Position {
  x: number;
  y: number;
}

export function ErdCanvas({ schema }: { schema: ErdSchema }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [dragging, setDragging] = useState<{ table: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Grid layout, recomputed only when the table set changes.
  useEffect(() => {
    const cols = Math.ceil(Math.sqrt(schema.tables.length));
    const next: Record<string, Position> = {};
    schema.tables.forEach((table, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const height = HEADER_HEIGHT + table.columns.length * ROW_HEIGHT;
      next[table.name] = {
        x: col * (TABLE_WIDTH + H_GAP) + 40,
        y: row * (height + V_GAP) + 40,
      };
    });
    setPositions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.tables.map((t) => t.name).join(",")]);

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(5, Math.max(0.1, z * factor)));
  }

  function handleCanvasMouseDown(e: ReactMouseEvent) {
    if ((e.target as HTMLElement).closest(".db-table-card")) return;
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handleTableMouseDown(e: ReactMouseEvent, tableName: string) {
    if (!(e.target as HTMLElement).closest(".db-table-header")) return;
    const pos = positions[tableName];
    setDragging({ table: tableName, offsetX: e.clientX - pos.x * zoom, offsetY: e.clientY - pos.y * zoom });
    e.stopPropagation();
  }

  function handleMouseMove(e: ReactMouseEvent) {
    if (dragging) {
      setPositions((prev) => ({
        ...prev,
        [dragging.table]: {
          x: (e.clientX - dragging.offsetX) / zoom,
          y: (e.clientY - dragging.offsetY) / zoom,
        },
      }));
    } else if (panning && panStart.current) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    }
  }

  function handleMouseUp() {
    setDragging(null);
    setPanning(false);
    panStart.current = null;
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const lines = useMemo(() => {
    return schema.edges
      .map((edge) => {
        const source = positions[edge.sourceTable];
        const target = positions[edge.targetTable];
        const sourceTable = schema.tables.find((t) => t.name === edge.sourceTable);
        const targetTable = schema.tables.find((t) => t.name === edge.targetTable);
        if (!source || !target || !sourceTable || !targetTable) return null;

        const sourceColIdx = sourceTable.columns.findIndex((c) => c.name === edge.sourceColumn);
        const targetColIdx = targetTable.columns.findIndex((c) => c.name === edge.targetColumn);

        const sy = source.y + HEADER_HEIGHT + Math.max(0, sourceColIdx) * ROW_HEIGHT + ROW_HEIGHT / 2;
        const ty = target.y + HEADER_HEIGHT + Math.max(0, targetColIdx) * ROW_HEIGHT + ROW_HEIGHT / 2;

        const sourceOnLeft = source.x < target.x;
        const sx = sourceOnLeft ? source.x + TABLE_WIDTH : source.x;
        const tx = sourceOnLeft ? target.x : target.x + TABLE_WIDTH;

        return { key: edge.constraintName, sx, sy, tx, ty };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [schema, positions]);

  const bounds = useMemo(() => {
    let maxX = 2000;
    let maxY = 2000;
    for (const table of schema.tables) {
      const pos = positions[table.name];
      if (!pos) continue;
      const height = HEADER_HEIGHT + table.columns.length * ROW_HEIGHT;
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH + 100);
      maxY = Math.max(maxY, pos.y + height + 100);
    }
    return { width: maxX, height: maxY };
  }, [schema.tables, positions]);

  return (
    <div className={`dbml-canvas ${panning ? "panning" : ""}`} ref={canvasRef} onWheel={handleWheel}>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }} className="diagram-controls">
        <button className="btn-icon" onClick={() => setZoom((z) => Math.min(5, z * 1.2))} title="Zoom in">
          <Plus size={14} />
        </button>
        <button className="btn-icon" onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))} title="Zoom out">
          <Minus size={14} />
        </button>
        <button className="btn-icon" onClick={resetView} title="Reset view">
          <RotateCcw size={14} />
        </button>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 4 }}>{Math.round(zoom * 100)}%</span>
      </div>

      <div
        className="dbml-viewport"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          minWidth: bounds.width,
          minHeight: bounds.height,
        }}
      >
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: bounds.width, height: bounds.height, pointerEvents: "none" }}
        >
          {lines.map((line) => (
            <line
              key={line.key}
              x1={line.sx}
              y1={line.sy}
              x2={line.tx}
              y2={line.ty}
              stroke="var(--accent-primary)"
              strokeWidth={2}
              opacity={0.6}
              strokeDasharray="5,3"
            />
          ))}
        </svg>

        {schema.tables.map((table) => {
          const pos = positions[table.name];
          if (!pos) return null;
          return (
            <div
              key={table.name}
              className={`db-table-card ${dragging?.table === table.name ? "dragging" : ""}`}
              style={{ left: pos.x, top: pos.y, width: TABLE_WIDTH }}
              onMouseDown={(e) => handleTableMouseDown(e, table.name)}
            >
              <div className="db-table-header">
                <Table2 size={14} />
                {table.name}
              </div>
              <div className="db-table-body">
                {table.columns.map((col) => {
                  const isFk = schema.edges.some((e) => e.sourceTable === table.name && e.sourceColumn === col.name);
                  return (
                    <div key={col.name} className="db-table-column">
                      <span className="column-name">
                        {col.name}
                        {col.isPrimaryKey && <span className="column-key" data-key="PK">PK</span>}
                        {isFk && <span className="column-key" data-key="FK">FK</span>}
                      </span>
                      <span className="column-type" title={col.dataType}>
                        {col.dataType}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
