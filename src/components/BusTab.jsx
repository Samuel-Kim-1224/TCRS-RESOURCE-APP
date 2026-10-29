import { buildMonthRows, BUS_HEADERS } from '../utils/buildRows.js';
import SpreadsheetTable from './SpreadsheetTable.jsx';

export default function BusTab({ conducts, monthKey }) {
  const rows = buildMonthRows(conducts, {}, monthKey, 'bus');
  const warnings = [...new Set(rows.map((row) => row.scheduleWarning).filter(Boolean))];
  return (
    <>
      {warnings.map((warning) => <div className="status-message status-error" role="alert" key={warning}>{warning}</div>)}
      <SpreadsheetTable
        headers={BUS_HEADERS}
        rows={rows}
        filename={`bus-troop-lift-${monthKey}.csv`}
        emptyLabel="No bus / troop-lift indents for this month. Add BTP, HG, IFC, BIC, or ISAD conducts."
      />
    </>
  );
}
