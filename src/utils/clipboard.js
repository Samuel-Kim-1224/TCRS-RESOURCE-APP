// Tab-separated output pastes directly into Excel / Google Sheets as proper
// columns, which is the "easily copied onto other spreadsheets" requirement.

export function rowsToTSV(rows) {
  return rows.map((row) => row.map(cellToText).join('\t')).join('\n');
}

function cellToText(cell) {
  if (cell === null || cell === undefined) return '';
  return String(cell);
}

export async function copyRowsToClipboard(rows) {
  const tsv = rowsToTSV(rows);
  await navigator.clipboard.writeText(tsv);
}

export function downloadCSV(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cellToText(cell);
          if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
          return text;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
