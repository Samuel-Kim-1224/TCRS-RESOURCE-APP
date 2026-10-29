import * as XLSX from '@e965/xlsx';
import { COMPANIES, companySchool } from '../data/companies.js';

const COMPANY_BY_ALIAS = new Map();
for (const company of COMPANIES) {
  COMPANY_BY_ALIAS.set(company.code.toUpperCase(), company.code);
  COMPANY_BY_ALIAS.set(company.name.toUpperCase(), company.code);
}

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const MONTH_LOOKUP = new Map();
MONTHS.forEach((name, index) => {
  MONTH_LOOKUP.set(name, index + 1);
  MONTH_LOOKUP.set(name.slice(0, 3), index + 1);
});

const normalizeHeader = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const text = (cell) => String(cell?.w ?? cell?.v ?? '').trim();

function sheetRange(sheet) {
  if (!sheet['!ref']) return null;
  return XLSX.utils.decode_range(sheet['!ref']);
}

function cellAt(sheet, row, col) {
  return sheet[XLSX.utils.encode_cell({ r: row, c: col })];
}

function rowText(sheet, row, range) {
  const values = [];
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    values.push(text(cellAt(sheet, row, col)));
  }
  return values;
}

function findHeader(sheet, isHeader) {
  const range = sheetRange(sheet);
  if (!range) return null;
  const lastHeaderRow = Math.min(range.e.r, range.s.r + 14);
  for (let row = range.s.r; row <= lastHeaderRow; row += 1) {
    const values = rowText(sheet, row, range);
    if (isHeader(values.map(normalizeHeader).join(' '), values)) {
      return { range, row, values };
    }
  }
  return null;
}

function findHeaderColumn(sheet, rows, range, predicate, startRow = range.s.r, endRow = range.e.r) {
  for (let row = startRow; row <= Math.min(endRow, range.e.r); row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      if (predicate(normalizeHeader(text(cellAt(sheet, row, col))))) return col;
    }
  }
  return null;
}

function findExactOrIncludes(sheet, range, labels, startRow, endRow, { exact = false } = {}) {
  const expected = labels.map(normalizeHeader);
  return findHeaderColumn(
    sheet,
    null,
    range,
    (value) => expected.some((label) => (exact ? value === label : value.includes(label))),
    startRow,
    endRow,
  );
}

function parseMonthTitle(raw) {
  const upper = String(raw || '').toUpperCase();
  const match = upper.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
  if (!match) return null;
  const month = MONTH_LOOKUP.get(match[1]);
  const yearMatch = upper.match(/\b(20\d{2}|\d{2})\b/);
  let year = yearMatch ? Number(yearMatch[1]) : null;
  if (year !== null && year < 100) year += year >= 70 ? 1900 : 2000;
  return { month, year, label: match[1] };
}

function assertPasteMonthMatches(raw, monthKey) {
  const titleLine = String(raw || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
  const titleMonth = parseMonthTitle(titleLine);
  if (!titleMonth) return;
  const [year, month] = monthKey.split('-').map(Number);
  if (titleMonth.month !== month || (titleMonth.year && titleMonth.year !== year)) {
    const pasted = `${MONTHS[titleMonth.month - 1]}${titleMonth.year ? ` ${titleMonth.year}` : ''}`;
    const selected = `${MONTHS[month - 1]} ${year}`;
    throw new Error(`This Troop Lift list is for ${pasted}, but the app is showing ${selected}. Change the app month before generating.`);
  }
}

function normalizeCompanyToken(value) {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+COY\b/g, '').replace(/\s+/g, ' ');
  return COMPANY_BY_ALIAS.get(normalized) || null;
}

export function companyCodesFromCell(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const exact = normalizeCompanyToken(raw);
  if (exact) return [exact];

  const found = new Set();
  const pieces = raw.split(/[,/&;]+/).map((part) => part.trim()).filter(Boolean);
  for (const piece of pieces) {
    const code = normalizeCompanyToken(piece);
    if (code) found.add(code);
    const match = piece.toUpperCase().match(/^\s*(1ST|2ND|3RD|[4-7]TH|[A-HJ-OP-W])\b(?:\s+COY)?/);
    if (match) {
      const fromCode = normalizeCompanyToken(match[1]);
      if (fromCode) found.add(fromCode);
    }
  }
  return [...found];
}

function schoolFromActivity(value) {
  const match = String(value || '').toUpperCase().match(/\bSCH(?:OOL)?\s*(I{1,3}|IV|1|2|3|4)\b/);
  if (!match) return null;
  const aliases = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', I: 'I', II: 'II', III: 'III', IV: 'IV' };
  return aliases[match[1]];
}

function companyFromActivity(value) {
  const match = String(value || '').toUpperCase().match(/\b(1ST|2ND|3RD|[4-7]TH|[A-HJ-OP-W])\s+COY\b/);
  return match ? normalizeCompanyToken(match[1]) : null;
}

function parseDateValue(cell) {
  if (!cell) return '';
  const formatted = text(cell);
  const dateMatch = formatted.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dateMatch) {
    let year = Number(dateMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return `${year}-${String(Number(dateMatch[2])).padStart(2, '0')}-${String(Number(dateMatch[1])).padStart(2, '0')}`;
  }

  if (typeof cell.v === 'number') {
    const parts = XLSX.SSF.parse_date_code(cell.v);
    if (parts?.y && parts?.m && parts?.d) {
      return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
    }
  }

  const longMonth = formatted.match(/^(\d{1,2})[- ]([A-Z]{3,9})[- ](\d{4})$/i);
  if (longMonth) {
    const month = MONTH_LOOKUP.get(longMonth[2].toUpperCase());
    if (month) return `${longMonth[3]}-${String(month).padStart(2, '0')}-${String(Number(longMonth[1])).padStart(2, '0')}`;
  }
  return '';
}

function parseTimeValue(cell) {
  if (!cell) return '';
  const formatted = text(cell);
  const clock = formatted.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\b/i);
  if (clock) {
    let hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    const meridiem = clock[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
  }
  if (typeof cell.v === 'number') {
    if (cell.v >= 0 && cell.v < 1) {
      const minutes = Math.round(cell.v * 24 * 60) % (24 * 60);
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
    }
    if (Number.isInteger(cell.v) && cell.v >= 0 && cell.v <= 2359) {
      return String(cell.v).padStart(4, '0');
    }
  }
  const digits = formatted.replace(/\D/g, '');
  if (digits.length >= 3 && digits.length <= 4) return digits.padStart(4, '0');
  return '';
}

function parseCount(value) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : 0;
}

function countFromTonnerNotes(values) {
  for (const value of values) {
    const match = String(value ?? '').match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:5\s*[- ]?TON(?:NER)?S?|TONNERS?)\b/i);
    if (match) return Number(match[1]);
  }
  return 0;
}

function isRedFill(cell) {
  const colors = [cell?.s?.fgColor?.rgb, cell?.s?.bgColor?.rgb].filter(Boolean);
  return colors.some((color) => {
    const hex = String(color).replace(/^#/, '').slice(-6);
    if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return red > 180 && red - green > 80 && red - blue > 80;
  });
}

function rowHasRedFill(sheet, row, range) {
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    if (isRedFill(cellAt(sheet, row, col))) return true;
  }
  return false;
}

function normalizeConductName(value) {
  let name = String(value || '').trim().replace(/^\*|\*$/g, '').trim();
  name = name.replace(/^SCH(?:OOL)?\s*(?:I{1,3}|IV|[1-4])\s*[-–:]\s*/i, '');
  const companyAtom = '(?:1ST|2ND|3RD|[4-7]TH|[A-HJ-OP-W])';
  name = name.replace(new RegExp(`^${companyAtom}(?:\\s*,\\s*${companyAtom})*\\s+COY\\s*[-–:]\\s*`, 'i'), '');
  name = name.replace(/\s+/g, ' ').trim();
  const upper = name.toUpperCase();
  if (/\bRE\s*[- ]?IFC\b/.test(upper)) return { key: 'RE_IFC', label: 're-IFC' };
  if (/\bRE\s*[- ]?(?:SIT|SITEST)\b/.test(upper)) return { key: 'RE_SIT', label: 're-SIT test' };
  if ((/\bFC\b/.test(upper) || /SITTEST|SITEST|SIT\s+TEST/.test(upper)) && /\b(?:NMT|RTU|TRANSITION)\b/.test(upper)) {
    return { key: 'IFC', label: 'IFC' };
  }
  if (/\bISAD\b/.test(upper)) return { key: 'ISAD', label: 'ISAD' };
  if (/\bBTP\b/.test(upper)) return { key: 'BTP', label: 'BTP' };
  if (/\bBIC\b/.test(upper)) return { key: 'BIC', label: 'BIC' };
  if (/\bHG\b/.test(upper)) return { key: 'HG', label: 'HG' };
  if (/\bIFC\b/.test(upper)) return { key: 'IFC', label: 'IFC' };
  const ippt = upper.match(/\bIPPT\s*(\d+)\b/);
  if (ippt) return { key: `IPPT${ippt[1]}`, label: `IPPT${ippt[1]}` };
  return { key: upper.replace(/[^A-Z0-9]+/g, ' ').trim(), label: name || 'Conduct' };
}

function headerMap(sheet, header, range) {
  const from = range.s.r;
  const to = Math.min(range.e.r, header.row + 4);
  return (labels, exact = false) => findExactOrIncludes(sheet, range, labels, from, to, { exact });
}

function parseIcrfSheet(sheet, homeSchool) {
  const header = findHeader(sheet, (joined) => joined.includes('activity name') && (joined.includes('resource') || joined.includes('type of veh')));
  if (!header) return [];
  const { range, row: headerRow } = header;
  const col = headerMap(sheet, header, range);
  const activityCol = col(['activity name'], true);
  const resourceCol = col(['type of veh', 'resource'], false);
  const startGroupCol = findHeaderColumn(sheet, null, range, (value) => value === 'start', range.s.r, headerRow + 2);
  const endGroupCol = findHeaderColumn(sheet, null, range, (value) => value === 'end', range.s.r, headerRow + 2);
  const startDateCol = startGroupCol ?? col(['start date'], false);
  const startTimeCol = startGroupCol !== null ? startGroupCol + 1 : null;
  const endDateCol = endGroupCol ?? col(['end date'], false);
  const endTimeCol = endGroupCol !== null ? endGroupCol + 1 : null;
  const reportingCol = col(['reporting'], false);
  const destinationCol = col(['destination'], false);
  const qtyCol = col(['qty', 'quantity'], false);
  const remarksCol = col(['remarks'], false);
  if (activityCol === null || startDateCol === null) return [];

  const output = [];
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const activity = text(cellAt(sheet, row, activityCol));
    if (!activity) continue;
    const date = parseDateValue(cellAt(sheet, row, startDateCol));
    if (!date) continue;
    if (rowHasRedFill(sheet, row, range)) continue;

    const rawEndDate = endDateCol === null ? '' : parseDateValue(cellAt(sheet, row, endDateCol));
    const endDate = rawEndDate || date;
    const companyValues = [
      reportingCol === null ? '' : text(cellAt(sheet, row, reportingCol)),
      destinationCol === null ? '' : text(cellAt(sheet, row, destinationCol)),
    ];
    let companyCodes = [...new Set(companyValues.flatMap(companyCodesFromCell))];
    if (!companyCodes.length) {
      const fallback = companyFromActivity(activity);
      if (fallback) companyCodes = [fallback];
    }
    const activitySchool = schoolFromActivity(activity);
    if (companyCodes.length) {
      companyCodes = companyCodes.filter((code) => companySchool(code) === homeSchool);
    } else if (activitySchool !== homeSchool) {
      continue;
    }

    const conduct = normalizeConductName(activity);
    const rowRecord = {
      date,
      endDate,
      startTime: parseTimeValue(startTimeCol === null ? null : cellAt(sheet, row, startTimeCol)),
      endTime: parseTimeValue(endTimeCol === null ? null : cellAt(sheet, row, endTimeCol)),
      conductKey: conduct.key,
      conductName: conduct.label,
      activity,
      resource: resourceCol === null ? '' : text(cellAt(sheet, row, resourceCol)),
      quantity: qtyCol === null ? '' : text(cellAt(sheet, row, qtyCol)),
      remarks: remarksCol === null ? '' : text(cellAt(sheet, row, remarksCol)),
      schoolContext: activitySchool,
    };
    if (companyCodes.length) {
      for (const companyCode of companyCodes) output.push({ ...rowRecord, companyCode });
    } else {
      output.push({ ...rowRecord, companyCode: null });
    }
  }
  return output;
}

function sheetSchool(sheetName) {
  const match = String(sheetName || '').toUpperCase().match(/\bSCH(?:OOL)?\s*(I{1,3}|IV|[1-4])\b/);
  if (!match) return null;
  return ({ '1': 'I', '2': 'II', '3': 'III', '4': 'IV', I: 'I', II: 'II', III: 'III', IV: 'IV' })[match[1]];
}

function dayDate(monthKey, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{1,2}$/.test(raw)) {
    const day = Number(raw);
    return day >= 1 && day <= 31 ? `${monthKey}-${String(day).padStart(2, '0')}` : '';
  }
  const fullDate = parseDateValue({ v: value, w: raw });
  if (fullDate) return fullDate;
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 1 || day > 31) return '';
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

function parseMedicSheet(sheet, sheetName, monthKey, homeSchool) {
  const header = findHeader(sheet, (joined) => joined.includes('date') && joined.includes('coy') && joined.includes('start time') && joined.includes('conduct'));
  if (!header) return [];
  const { range, row: headerRow } = header;
  const col = headerMap(sheet, header, range);
  const dateCol = col(['date'], true);
  const companyCol = col(['coy'], true);
  const startCol = col(['start time', 'timing'], false);
  const conductCol = col(['conduct'], true);
  if ([dateCol, startCol, conductCol].some((value) => value === null)) return [];

  const sourceSchool = sheetSchool(sheetName);
  const rows = [];
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const conductName = text(cellAt(sheet, row, conductCol));
    const date = dayDate(monthKey, text(cellAt(sheet, row, dateCol)) || cellAt(sheet, row, dateCol)?.v);
    if (!date || !conductName) continue;
    const rawCompany = companyCol === null ? '' : text(cellAt(sheet, row, companyCol));
    const codes = companyCodesFromCell(rawCompany).filter((code) => companySchool(code) === homeSchool);
    if (!rawCompany && sourceSchool !== homeSchool) continue;
    if (rawCompany && !codes.length) continue;
    const conduct = normalizeConductName(conductName);
    const record = {
      date,
      endDate: date,
      startTime: parseTimeValue(cellAt(sheet, row, startCol)),
      conductKey: conduct.key,
      conductName: conduct.label,
      rawConduct: conductName,
      schoolContext: sourceSchool,
    };
    if (codes.length) {
      for (const companyCode of codes) rows.push({ ...record, companyCode });
    } else {
      rows.push({ ...record, companyCode: null });
    }
  }
  return rows;
}

function purposeCompany(value) {
  const raw = String(value || '').trim();
  const exact = companyCodesFromCell(raw);
  if (exact.length === 1) return exact[0];
  const first = raw.match(/^\s*(1ST|2ND|3RD|[4-7]TH|[A-HJ-OP-W])\b/i)?.[1];
  return first ? normalizeCompanyToken(first) : null;
}

function tripFromFields({ date, time, companyCode, purpose, route, busCount, remarks, otherRemarks, supportedTonners }) {
  let vehicleType = 'BUS';
  let quantity = parseCount(busCount);
  if (quantity <= 0) {
    const fromRemarks = countFromTonnerNotes([remarks, otherRemarks, supportedTonners]);
    const explicitTonners = parseCount(supportedTonners);
    quantity = fromRemarks || explicitTonners;
    vehicleType = quantity > 0 ? 'TONNER' : 'UNKNOWN';
  }
  const conduct = normalizeConductName(purpose);
  return {
    date,
    time,
    timeEnd: '',
    companyCode,
    purpose: String(purpose || '').trim(),
    route: String(route || '').replace(/\s*[-–]\s*/g, ' - ').trim(),
    vehicleType,
    quantity,
    conductKey: conduct.key,
    conductName: conduct.label,
  };
}

function parseTroopLiftSheet(sheet, monthKey, homeSchool) {
  const header = findHeader(sheet, (joined) => joined.includes('day') && joined.includes('time') && joined.includes('coy unit') && joined.includes('purpose') && joined.includes('pick up point'));
  if (!header) return [];
  const { range, row: headerRow } = header;
  const col = headerMap(sheet, header, range);
  const dayCol = findHeaderColumn(sheet, null, range, (value) => value === 'day', headerRow, headerRow);
  const timeCol = findHeaderColumn(sheet, null, range, (value) => value === 'time', headerRow, headerRow);
  const companyCol = col(['coy unit', 'coy/unit'], false);
  const purposeCol = col(['purpose'], true);
  const routeCol = col(['pick up point to drop off point', 'pick up point'], false);
  const busCol = findHeaderColumn(sheet, null, range, (value) => value === 'no of buses', headerRow, headerRow);
  const remarksCol = findHeaderColumn(sheet, null, range, (value) => value === 'remarks', headerRow, headerRow);
  const tonnersCol = findHeaderColumn(sheet, null, range, (value) => value === 'no of 5 tons supported' || value === 'no of 5 tons', headerRow, headerRow);
  let secondRemarksCol = null;
  if (remarksCol !== null) {
    for (let col = remarksCol + 1; col <= range.e.c; col += 1) {
      if (normalizeHeader(text(cellAt(sheet, headerRow, col))) === 'remarks') {
        secondRemarksCol = col;
        break;
      }
    }
  }
  if ([dayCol, timeCol, companyCol, purposeCol, routeCol, busCol].some((value) => value === null)) return [];

  const output = [];
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const dayValue = text(cellAt(sheet, row, dayCol)) || cellAt(sheet, row, dayCol)?.v;
    const date = dayDate(monthKey, dayValue);
    const route = text(cellAt(sheet, row, routeCol));
    const purpose = text(cellAt(sheet, row, purposeCol));
    if (!date || !route || !purpose) continue;
    const companyCode = purposeCompany(text(cellAt(sheet, row, companyCol)));
    if (!companyCode || companySchool(companyCode) !== homeSchool) continue;
    const trip = tripFromFields({
      date,
      time: parseTimeValue(cellAt(sheet, row, timeCol)),
      companyCode,
      purpose,
      route,
      busCount: text(cellAt(sheet, row, busCol)),
      remarks: remarksCol === null ? '' : text(cellAt(sheet, row, remarksCol)),
      otherRemarks: secondRemarksCol === null ? '' : text(cellAt(sheet, row, secondRemarksCol)),
      supportedTonners: tonnersCol === null ? '' : text(cellAt(sheet, row, tonnersCol)),
    });
    output.push(trip);
  }
  return output;
}

function parseTroopLiftText(rawText, monthKey, homeSchool) {
  assertPasteMonthMatches(rawText, monthKey);
  const lines = String(rawText || '').replace(/\r/g, '').split('\n');
  const [year, month] = monthKey.split('-').map(Number);
  let activeDate = '';
  const trips = [];
  for (const original of lines) {
    const line = original.replace(/\*/g, '').trim();
    if (!line) continue;
    const dateHeading = line.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\s*$/);
    if (dateHeading) {
      const day = Number(dateHeading[1]);
      const headingMonth = Number(dateHeading[2]);
      let headingYear = dateHeading[3] ? Number(dateHeading[3]) : year;
      if (headingYear < 100) headingYear += headingYear >= 70 ? 1900 : 2000;
      if (headingMonth !== month || headingYear !== year) {
        throw new Error(`This Troop Lift list contains ${String(day).padStart(2, '0')}/${String(headingMonth).padStart(2, '0')}/${headingYear}, but the app is showing ${MONTHS[month - 1]} ${year}. Change the app month before generating.`);
      }
      activeDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      continue;
    }
    if (!activeDate) continue;

    const tripLine = line.match(/^\s*(\d{3,4})(?:\s*[-–]\s*(\d{3,4}))?\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(BUSES?|TONNERS?)\s*(?:\((.*?)\))?\s*$/i);
    if (!tripLine) continue;
    const [, rawStart, rawEnd, route, quantity, unit, metadata = ''] = tripLine;
    const companyCode = purposeCompany(metadata);
    if (!companyCode || companySchool(companyCode) !== homeSchool) continue;
    const purpose = metadata.replace(/^\s*(?:1ST|2ND|3RD|[4-7]TH|[A-HJ-OP-W])\s*(?:COY\s*)?/i, '').trim();
    const isTonner = unit.toUpperCase().startsWith('TONNER');
    const conduct = normalizeConductName(purpose);
    trips.push({
      date: activeDate,
      time: rawStart.padStart(4, '0'),
      timeEnd: rawEnd ? rawEnd.padStart(4, '0') : '',
      companyCode,
      purpose,
      route: route.replace(/\s*[-–]\s*/g, ' - ').trim(),
      vehicleType: isTonner ? 'TONNER' : 'BUS',
      quantity: Number(quantity),
      conductKey: conduct.key,
      conductName: conduct.label,
    });
  }
  return trips;
}

function classifySheet(sheet) {
  const header = findHeader(sheet, (joined) => (
    joined.includes('activity name') && (joined.includes('resource') || joined.includes('type of veh'))
  ) || (
    joined.includes('date') && joined.includes('coy') && joined.includes('start time') && joined.includes('conduct')
  ) || (
    joined.includes('day') && joined.includes('time') && joined.includes('coy unit') && joined.includes('purpose') && joined.includes('pick up point')
  ));
  if (!header) return null;
  const joined = header.values.map(normalizeHeader).join(' ');
  if (joined.includes('activity name') && (joined.includes('resource') || joined.includes('type of veh'))) return 'icrf';
  if (joined.includes('coy unit') && joined.includes('purpose')) return 'troopLift';
  if (joined.includes('start time') && joined.includes('conduct')) return 'medic';
  return null;
}

export async function parseIndentWorkbook(file, { monthKey, homeSchool }) {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellStyles: true,
    cellDates: false,
  });
  const found = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const type = classifySheet(sheet);
    if (!type) continue;
    const records = type === 'icrf'
      ? parseIcrfSheet(sheet, homeSchool)
      : type === 'medic'
        ? parseMedicSheet(sheet, sheetName, monthKey, homeSchool)
        : parseTroopLiftSheet(sheet, monthKey, homeSchool);
    (found[type] ||= []).push(...records);
  }
  if (!Object.keys(found).length) {
    throw new Error(`Could not identify ICRF, Medic, or Troop Lift data in “${file.name}”. Check that the workbook includes its column headings.`);
  }
  return found;
}

export function parsePastedTroopLift(rawText, { monthKey, homeSchool }) {
  return parseTroopLiftText(rawText, monthKey, homeSchool);
}

export function dedupeImportedRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
