import SpreadsheetTable from './SpreadsheetTable.jsx';
import { buildMonthRows, VEHICLE_HEADERS } from '../utils/buildRows.js';

export default function VehicleTab({ conducts, cwos, monthKey }) {
  const rows = buildMonthRows(conducts, cwos, monthKey, 'vehicle');
  return (
    <SpreadsheetTable
      headers={VEHICLE_HEADERS}
      rows={rows}
      filename={`vehicle-indent-${monthKey}.csv`}
      emptyLabel="No vehicle indents generated for this month yet. Add a conduct to populate this sheet."
    />
  );
}
