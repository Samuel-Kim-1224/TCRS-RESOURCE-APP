import { generateIndents } from './rulesEngine.js';
import { companyName } from '../data/companies.js';
import { formatDDMMYYYY, dayOfMonth } from './dateUtils.js';
import { conductDisplayName } from '../data/conducts.js';

export const VEHICLE_HEADERS = [
  'Serial / Name', 'Vehicle', 'Qty', 'Qty', 'Date Starting', 'Time Starting',
  'Date Ending', 'Company (1)', 'Company (2)', 'CWO Name', 'CWO Number',
  'Unit', 'Remarks',
];

export const MEDIC_HEADERS = ['Date', 'Period', 'COY', 'Start Time', 'End Time', 'Conduct'];

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
      entryId: entry.id,
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
  }));
}

/** Filters + flattens + sorts rows for all conducts whose *start date* is in monthKey ('yyyy-mm'). */
export function buildMonthRows(conducts, cwos, monthKey, kind) {
  const inMonth = conducts.filter((c) => c.date.slice(0, 7) === monthKey);
  const builder = kind === 'vehicle' ? (c) => vehicleRowsForEntry(c, cwos) : (c) => medicRowsForEntry(c);
  const rows = inMonth.flatMap(builder);
  rows.sort((a, b) => (a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : 0));
  return rows;
}

export const SUMMARY_HEADERS = [
  'Date', 'End Date', 'Company', 'Conduct', 'Period', 'Status', 'Vehicles Indented', 'Medic Required',
];

/** One row per conduct entry (not per generated indent line) - a quick-glance summary for the month. */
export function buildSummaryRows(conducts, monthKey) {
  const inMonth = conducts
    .filter((c) => c.date.slice(0, 7) === monthKey)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return inMonth.map((c) => {
    const { vehicleRows, medicRows } = generateIndents(c);
    const vehicleTypes = [...new Set(vehicleRows.map((r) => r.vehicleType))];
    const medicNeeded = medicRows.some((r) => r.start);
    return {
      cells: [
        formatDDMMYYYY(c.date),
        formatDDMMYYYY(c.endDate || c.date),
        companyName(c.companyCode),
        conductDisplayName(c),
        c.period || 'FULL DAY',
        c.status,
        vehicleTypes.length ? vehicleTypes.join(', ') : 'None',
        medicNeeded ? 'Yes' : 'No',
      ],
      sortDate: c.date,
      entryId: c.id,
    };
  });
}
