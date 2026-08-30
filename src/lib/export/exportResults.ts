function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRows(rows: Record<string, unknown>[], format: "json" | "csv") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (format === "json") {
    downloadBlob(JSON.stringify(rows, null, 2), `query-results-${timestamp}.json`, "application/json");
  } else {
    downloadBlob(convertToCSV(rows), `query-results-${timestamp}.csv`, "text/csv");
  }
}
