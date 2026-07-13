import SpreadsheetTable from './SpreadsheetTable.jsx';
import { buildSummaryRows, SUMMARY_HEADERS } from '../utils/buildRows.js';

export default function IndentSummaryTab({ conducts, monthKey }) {
  const rows = buildSummaryRows(conducts, monthKey);
  return (
    <SpreadsheetTable
      headers={SUMMARY_HEADERS}
      rows={rows}
      filename={`indent-summary-${monthKey}.csv`}
      emptyLabel="No conducts added for this month yet."
    />
  );
}
