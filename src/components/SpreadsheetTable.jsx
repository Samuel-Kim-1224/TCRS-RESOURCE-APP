import { useState } from 'react';
import { copyRowsToClipboard, downloadCSV } from '../utils/clipboard.js';

export default function SpreadsheetTable({ headers, rows, filename, emptyLabel }) {
  const [copied, setCopied] = useState(false);

  const allRows = [headers, ...rows.map((r) => r.cells)];

  const handleCopy = async () => {
    try {
      await copyRowsToClipboard(allRows);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sheet-panel">
      <div className="sheet-toolbar">
        <button className="btn btn-secondary" onClick={handleCopy} disabled={rows.length === 0}>
          {copied ? 'Copied ✓' : 'Copy for spreadsheet'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => downloadCSV(filename, allRows)}
          disabled={rows.length === 0}
        >
          Download CSV
        </button>
        <span className="sheet-count">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div className="sheet-scroll">
        <table className="sheet-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="sheet-empty" colSpan={headers.length}>
                  {emptyLabel || 'No rows yet for this month.'}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className={row.cells[row.cells.length - 1] === 'PREPARK' ? 'row-prepark' : ''}>
                {row.cells.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
