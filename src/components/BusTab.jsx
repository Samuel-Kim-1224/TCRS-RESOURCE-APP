import { buildMonthRows, BUS_HEADERS } from '../utils/buildRows.js';
import SpreadsheetTable from './SpreadsheetTable.jsx';

export default function BusTab({ conducts, monthKey }) {
  const rows = buildMonthRows(conducts, {}, monthKey, 'bus');
  return (
    <SpreadsheetTable
      headers={BUS_HEADERS}
      rows={rows}
      filename={`bus-troop-lift-${monthKey}.csv`}
      emptyLabel="No bus / troop-lift indents for this month. Add BTP, HG, IFC, BIC, or ISAD conducts."
    />
  );
}
