import SpreadsheetTable from './SpreadsheetTable.jsx';
import { buildMonthRows, MEDIC_HEADERS } from '../utils/buildRows.js';

export default function MedicTab({ conducts, monthKey }) {
  const rows = buildMonthRows(conducts, {}, monthKey, 'medic');
  return (
    <SpreadsheetTable
      headers={MEDIC_HEADERS}
      rows={rows}
      filename={`medic-indent-${monthKey}.csv`}
      emptyLabel="No conducts logged for this month yet."
    />
  );
}
