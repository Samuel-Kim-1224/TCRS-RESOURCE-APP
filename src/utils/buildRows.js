import { generateIndents } from './rulesEngine.js';
import { generateBusTrips } from './busEngine.js';
import { companyName } from '../data/companies.js';
import { formatDDMMYYYY, dayOfMonth } from './dateUtils.js';
import { conductDisplayName } from '../data/conducts.js';

export const VEHICLE_HEADERS = [
  'Serial / Name', 'Vehicle', 'Qty', 'Qty', 'Date Starting', 'Time Starting',
  'Date Ending', 'Company (1)', 'Company (2)', 'CWO Name', 'CWO Number',
  'Unit', 'Remarks',
];

export const MEDIC_HEADERS = ['Date', 'Period', 'COY', 'Start Time', 'End Time', 'Conduct'];

export const BUS_HEADERS = ['', 'Day', '', 'Time', 'COY', 'Trip', 'Route', 'Buses'];

function conductOverlapsMonth(entry, monthKey) {
  const end = entry.endDate || entry.date;
  return entry.date.slice(0, 7) <= monthKey && end.slice(0, 7) >= monthKey;
}

/** Builds the flat list of Vehicle-tab rows (as column arrays) for one conduct entry. */
export function vehicleRowsForEntry(entry, cwos) {
  const { vehicleRows } = generateIndents(entry);
  const cwo = cwos[entry.companyCode] || { name: '', number: '' };
  const coyName = companyName(entry.companyCode);
  const rows = [];

  for (const r of vehicleRows) {
    rows.push({
      cells: [
        `SCH 2 - ${entry.companyCode} COY - ${r.label}`,
        r.vehicleType,
        '1',
        '1',
        formatDDMMYYYY(r.startDate),
        r.startTime,
        formatDDMMYYYY(r.endDate),
        coyName,
        coyName,
        cwo.name,
        cwo.number,
        'TCRS 1 SCH 2',
        r.prepark ? 'PREPARK' : '',
      ],
      sortDate: r.startDate,
      sortTime: r.startTime,
      entryId: entry.id,
      conductStartDate: entry.date,
      rowKind: r.rowKind || 'conduct',
    });
  }
  return rows;
}

/** Builds the flat list of Medic-tab rows (as column arrays) for one conduct entry. */
export function medicRowsForEntry(entry) {
  const { medicRows } = generateIndents(entry);
  const coyName = companyName(entry.companyCode);
  return medicRows.map((r) => ({
    cells: [dayOfMonth(r.day), r.period, coyName, r.start, r.end, r.conductLabel],
    sortDate: r.day,
    entryId: entry.id,
    conductStartDate: entry.date,
  }));
}

export function busRowsForEntry(entry) {
  const trips = generateBusTrips(entry);
  return trips.map((t) => ({
    cells: ['', dayOfMonth(t.day), '', t.time, entry.companyCode, t.tripName, t.route, t.buses],
    sortDate: t.day,
    sortTime: t.time,
    entryId: entry.id,
    conductStartDate: entry.date,
  }));
}

function sortVehicleRows(a, b) {
  if (a.conductStartDate !== b.conductStartDate) {
    return a.conductStartDate < b.conductStartDate ? -1 : 1;
  }
  if (a.entryOrder !== b.entryOrder) return a.entryOrder - b.entryOrder;

  // Keep the prepark attached to its conduct, then group each conduct day.
  if (a.rowKind === 'prepark' || b.rowKind === 'prepark') {
    if (a.rowKind !== b.rowKind) return a.rowKind === 'prepark' ? -1 : 1;
  }
  if (a.sortDate !== b.sortDate) return a.sortDate < b.sortDate ? -1 : 1;

  // When chronology does not dictate the order: 5Ton, F550/SOUV, then LUV.
  const vehicleOrder = (row) => {
    const vehicle = row.cells[1];
    if (vehicle === '5 TON GS') return 0;
    if (vehicle === 'F550' || vehicle === 'SOUV') return 1;
    if (vehicle === 'LUV') return 2;
    return 3;
  };
  const vehicleDiff = vehicleOrder(a) - vehicleOrder(b);
  if (vehicleDiff !== 0) return vehicleDiff;

  const luvOrder = { draw: 0, conduct: 1, return: 2 };
  const rowKindDiff = (luvOrder[a.rowKind] ?? 1) - (luvOrder[b.rowKind] ?? 1);
  if (rowKindDiff !== 0) return rowKindDiff;
  return (a.sortTime || '').localeCompare(b.sortTime || '');
}

/** Filters + flattens + sorts rows for all conducts overlapping monthKey ('yyyy-mm'). */
export function buildMonthRows(conducts, cwos, monthKey, kind) {
  const inMonth = conducts.filter((c) => conductOverlapsMonth(c, monthKey));
  const builder =
    kind === 'vehicle'
      ? (c) => vehicleRowsForEntry(c, cwos)
      : kind === 'bus'
        ? (c) => busRowsForEntry(c)
        : (c) => medicRowsForEntry(c);
  const rows = inMonth.flatMap((conduct, entryOrder) =>
    builder(conduct).map((row) => ({ ...row, entryOrder })),
  );
  if (kind === 'vehicle') {
    rows.sort(sortVehicleRows);
  } else {
    rows.sort((a, b) => {
      if (a.conductStartDate !== b.conductStartDate) {
        return a.conductStartDate < b.conductStartDate ? -1 : 1;
      }
      if (a.sortDate !== b.sortDate) return a.sortDate < b.sortDate ? -1 : 1;
      return (a.sortTime || '') < (b.sortTime || '') ? -1 : 1;
    });
  }
  return rows;
}
