const KEYWORDS =
  /\b(SELECT|FROM|WHERE|LIMIT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|VIEW|INDEX|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|AND|OR|NOT|NULL|IS|IN|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END)\b/gi;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Renders SQL text as HTML for the highlight overlay: comments, then keywords, line by line
// so `--` comments never bleed across a line break.
export function highlightSql(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("--");
      if (commentIndex !== -1) {
        const before = line.slice(0, commentIndex);
        const comment = line.slice(commentIndex);
        return highlightKeywords(before) + `<span class="sql-comment">${escapeHtml(comment)}</span>`;
      }
      return highlightKeywords(line);
    })
    .join("\n");
}

function highlightKeywords(segment: string): string {
  const escaped = escapeHtml(segment);
  return escaped.replace(KEYWORDS, (match) => `<span class="sql-keyword">${match}</span>`);
}
