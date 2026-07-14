// All dates in app state are stored as 'yyyy-mm-dd' strings (native <input type=date> format).
// Spreadsheet output uses dd/mm/yyyy per the brief.

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDDMMYYYY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** dd/mm/yy for indent summary (e.g. 010726). */
export function formatDDMMYY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}${m}${y.slice(2)}`;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Mon-Fri counts as a working day; Sat/Sun are skipped. */
export function isWorkingDay(iso) {
  const day = parseISO(iso).getDay();
  return day !== 0 && day !== 6;
}

/** Returns the previous working day before the given ISO date. */
export function previousWorkingDay(iso) {
  let d = addDays(iso, -1);
  while (!isWorkingDay(d)) {
    d = addDays(d, -1);
  }
  return d;
}

/** Inclusive list of ISO dates between start and end. */
export function dateRange(startIso, endIso) {
  const dates = [];
  let cur = startIso;
  while (cur <= endIso) {
    dates.push(cur);
    if (cur === endIso) break;
    cur = addDays(cur, 1);
  }
  return dates;
}

export function dayOfMonth(iso) {
  return String(parseInt(iso.split('-')[2], 10));
}

/** Number of days in a monthKey 'yyyy-mm' (28–31). */
export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** ISO date for day-of-month within monthKey. */
export function isoForMonthDay(monthKey, day) {
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** e.g. "25 Jul" for bus summary day labels. */
export function formatDayLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

export function monthKey(iso) {
  return iso.slice(0, 7); // yyyy-mm
}
