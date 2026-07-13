import SpreadsheetTable from './SpreadsheetTable.jsx';

export default function BusTab() {
  return (
    <SpreadsheetTable
      headers={['Date', 'Company', 'Conduct', 'Pickup', 'Drop-off', 'Pax']}
      rows={[]}
      filename="bus-troop-lift.csv"
      emptyLabel="Bus / troop-lift indenting isn't defined yet — this tab is a placeholder ready for those rules."
    />
  );
}
