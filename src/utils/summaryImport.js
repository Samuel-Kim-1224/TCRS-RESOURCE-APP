import { COMPANIES, companyName, companySchool } from '../data/companies.js';
import { formatDDMMYY } from './dateUtils.js';

export const IMPORT_TYPES = [
  { id: 'ICRF', label: 'ICRF' },
  { id: 'MEDIC', label: 'MEDIC' },
  { id: 'TROOP_LIFT', label: 'TROOP LIFT' },
];

const MONTHS = {
  JANUARY: 1, JAN: 1, FEBRUARY: 2, FEB: 2, MARCH: 3, MAR: 3,
  APRIL: 4, APR: 4, MAY: 5, JUNE: 6, JUN: 6, JULY: 7, JUL: 7,
  AUGUST: 8, AUG: 8, SEPTEMBER: 9, SEP: 9, OCTOBER: 10, OCT: 10,
  NOVEMBER: 11, NOV: 11, DECEMBER: 12, DEC: 12,
};

const STANDARD_CONDUCTS = [
  ['RE-IFC', 'RE_IFC', /\b(?:2ND\s+)?RE\s*[- ]?IFC\b/i],
  ['RE-SITEST', 'RE_SIT', /\bRE\s*[- ]?SIT(?:E?ST|\s+TEST)\b/i],
  ['RE-IPPT', 'RE_IPPT', /\bRE\s*[- ]?IPPT\b/i],
  ['IFC', 'IFC', /\bIFC\b|\bSIT\s+TEST\b|\bSITEST\s+TRANSITION\b/i],
  ['BTP', 'BTP', /\bBTP\b|\bBTP\s*D[12]\b/i],
  ['BIC', 'BIC', /\bBIC\b/i],
  ['ISAD', 'ISAD', /\bISAD\b/i],
  ['HG', 'HG', /\bHG(?:\s|$)|\bHG\s+WAVE\s*\d*/i],
  ['IPPT', 'IPPT', /\bIPPT\s*\d*\b/i],
  ['SOC', 'SOC', /\bSOC\b/i],
  ['RM', 'RM', /\bRM\s+\d/i],
  ['ER', 'ER', /\bER\s*\d/i],
  ['TEMPO', 'TEMPO', /\bTEMPO\s*\d*/i],
  ['CC', 'CC', /\bCC\s*\d/i],
  ['DAC', 'DAC', /\bDAC\b/i],
  ['WP', 'WP', /\bWP\b/i],
  ['BPK', 'BPK', /\bBPK\b/i],
  ['IMT', 'IMT', /\bIMT\b/i],
];

const CUSTOM_CONDUCTS = [
  ['GP REHEARSAL', 'GP REHEARSAL'],
  ['GP REHEARS', 'GP REHEARSAL'],
  ['JS SHOOT', 'JS SHOOT'],
  ['DRILL COMP', 'DRILL COMP'],
  ['REC EVENING', 'REC EVENING'],
  ['SITEST ASSESSOR', 'SITEST ASSESSOR'],
];

function text(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalized(value) {
  return text(value).toUpperCase().replace(/[‐‑‒–—]/g, '-');
}

function cellAt(row, index) {
  return row?.values?.[index] ?? '';
}

function rowText(row) {
  return (row?.values || []).map(text).join(' ').toUpperCase();
}

function hasWords(row, words) {
  const contents = rowText(row);
  return words.every((word) => contents.includes(word));
}

export function detectWorkbookType(workbook) {
  const rows = workbook?.sheets?.flatMap((sheet) => sheet.rows) || [];
  if (rows.some((row) =>
    hasWords(row, ['ACTIVITY NAME', 'RESOURCE', 'EXECUTION TIME']) ||
    rowText(row).includes('FROM ATMS (SCH X - X COY - ACTIVITY NAME)'),
  )) return 'ICRF';

  if (rows.some((row) => hasWords(row, ['DATE', 'PERIOD', 'COY', 'START TIME', 'END TIME', 'CONDUCT']))) {
    return 'MEDIC';
  }

  if (rows.some((row) =>
    hasWords(row, ['COY/UNIT', 'PURPOSE', 'PICK-UP POINT TO DROP-OFF POINT', 'NO. OF BUSES']),
  )) return 'TROOP_LIFT';

  return '';
}

function excelDateToIso(serial) {
  if (!Number.isFinite(serial)) return '';
  const wholeDays = Math.floor(serial);
  const date = new Date(Date.UTC(1899, 11, 30) + wholeDays * 86400000);
  return date.toISOString().slice(0, 10);
}

export function parseDateValue(value) {
  if (typeof value === 'number') return excelDateToIso(value);
  const raw = text(value);
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const named = raw.match(/^(\d{1,2})[-/ ]([A-Z]+)[-/ ](\d{4})$/i);
  if (named) {
    const month = MONTHS[named[2].toUpperCase()];
    if (month) return `${named[3]}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
  }

  const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const day = first;
    const month = second;
    return `${numeric[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}

function parseDayNumber(value) {
  if (typeof value === 'number' && value >= 1 && value <= 31) return Math.floor(value);
  const raw = text(value);
  if (/^\d{1,2}$/.test(raw)) return Number(raw);
  const date = parseDateValue(value);
  return date ? Number(date.slice(8, 10)) : null;
}

export function parseTimeValue(value) {
  if (typeof value === 'number') {
    const minutes = value >= 1 ? Math.round(value) : Math.round(value * 1440);
    const dayMinutes = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(dayMinutes / 60)).padStart(2, '0')}:${String(dayMinutes % 60).padStart(2, '0')}`;
  }

  const raw = text(value);
  if (!raw) return '';
  const colon = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 3 || digits.length === 4) {
    const padded = digits.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }
  return raw;
}

function parseNumber(value) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function companyCodesFrom(value) {
  const raw = normalized(value);
  if (!raw) return [];

  const coyMatch = raw.match(/(?:^|[-\s])((?:[A-Z]|[1-7](?:ST|ND|RD|TH))(?:\s*[,/&]\s*(?:[A-Z]|[1-7](?:ST|ND|RD|TH)))*)\s+(?:COY|COMPANY)\b/);
  const tokens = coyMatch
    ? coyMatch[1].split(/\s*[,/&]\s*/)
    : [raw.replace(/\s+COY\b.*$/, '').trim()];

  const codes = [];
  for (const token of tokens) {
    const company = COMPANIES.find((candidate) =>
      normalized(candidate.code) === token || normalized(candidate.name) === token,
    );
    if (company && !codes.includes(company.code)) codes.push(company.code);
  }

  if (codes.length) return codes;
  const directName = COMPANIES.find((candidate) =>
    new RegExp(`(?:^|[^A-Z])${candidate.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^A-Z])`, 'i').test(raw),
  );
  return directName ? [directName.code] : [];
}

function activityText(value) {
  return text(value)
    .replace(/^SCH(?:OOL)?\s*\d+\s*-\s*/i, '')
    .replace(/^.*?\bCOY\s*-\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function conductIdentity(rawActivity, sourceType = '') {
  let activity = activityText(rawActivity);
  activity = activity
    .replace(/\b(?:PREPARK|DRAW|RETURN)\b/gi, ' ')
    .replace(/\bAMMO\s+VEH\b/gi, ' ')
    .replace(/\s*\((?:AM|PM)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedActivity = normalized(activity);
  for (const [label, key, pattern] of STANDARD_CONDUCTS) {
    const match = normalizedActivity.match(pattern);
    if (!match) continue;
    if (key === 'RM' || key === 'ER' || key === 'TEMPO' || key === 'CC') {
      return { key: `${key}:${normalizedActivity}`, label: normalizedActivity };
    }
    if (key === 'RE_IFC' && /^2ND\s+RE\s+IFC/.test(normalizedActivity)) {
      return { key: 'CUSTOM:2ND RE IFC', label: '2nd RE IFC' };
    }
    return { key, label };
  }

  for (const [needle, label] of CUSTOM_CONDUCTS) {
    if (normalizedActivity.includes(needle)) return { key: `CUSTOM:${label}`, label };
  }

  if (!normalizedActivity || /^(BOOK IN|BOOK OUT|BOOKING IN|BOOKING OUT)$/.test(normalizedActivity)) {
    return null;
  }
  if (sourceType === 'ICRF') {
    return { key: `CUSTOM:${normalizedActivity}`, label: normalizedActivity };
  }
  return null;
}

function detectMonthFromWorkbook(workbook) {
  const contents = workbook.sheets.flatMap((sheet) => sheet.rows).map(rowText).join(' ');
  const match = `${workbook.name || ''} ${contents}`.toUpperCase().match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[- _ ]?(20\d{2})\b/);
  if (match) return `${match[2]}-${String(MONTHS[match[1]]).padStart(2, '0')}`;
  const fileMonth = (workbook.name || '').toUpperCase().match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
  return fileMonth
    ? `${new Date().getFullYear()}-${String(MONTHS[fileMonth[1]]).padStart(2, '0')}`
    : '';
}

function makeRecords({ type, rowNumber, companyCodes, activity, date, endDate, ...rest }) {
  const identity = conductIdentity(activity, type);
  const codes = companyCodes.length ? companyCodes : [null];
  return codes.map((companyCode, index) => {
    const record = {
      sourceType: type,
      sourceRow: rowNumber,
      companyCode,
      activity: text(activity),
      conductKey: identity?.key || '',
      conductLabel: identity?.label || '',
      date,
      endDate: endDate || date,
      ...rest,
    };
    const fingerprint = JSON.stringify(record);
    let hash = 2166136261;
    for (let i = 0; i < fingerprint.length; i += 1) {
      hash = Math.imul(hash ^ fingerprint.charCodeAt(i), 16777619);
    }
    return { ...record, id: `${type}:${rowNumber}:${index}:${(hash >>> 0).toString(36)}` };
  });
}

function findMedicHeader(sheet) {
  return sheet.rows.findIndex((row) => hasWords(row, ['DATE', 'PERIOD', 'COY', 'START TIME', 'END TIME', 'CONDUCT']));
}

function parseMedic(workbook) {
  const sheet = workbook.sheets.find((candidate) => findMedicHeader(candidate) >= 0);
  if (!sheet) throw new Error('The MEDIC workbook is missing the Date/Period/COY/Conduct header row.');

  const headerIndex = findMedicHeader(sheet);
  const headers = sheet.rows[headerIndex].values.map((value) => normalized(value));
  const index = (name) => headers.indexOf(name);
  const result = [];

  for (let r = headerIndex + 1; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r].values;
    if (!row?.some((value) => text(value))) continue;
    const activity = text(row[index('CONDUCT')]);
    if (!activity) continue;
    const companyValue = row[index('COY')];
    result.push(...makeRecords({
      type: 'MEDIC',
      rowNumber: r + 1,
      companyCodes: companyCodesFrom(companyValue),
      activity,
      date: '',
      dayNumber: parseDayNumber(row[index('DATE')]),
      period: text(row[index('PERIOD')]),
      startTime: parseTimeValue(row[index('START TIME')]),
      endTime: parseTimeValue(row[index('END TIME')]),
      companyRaw: text(companyValue),
    }));
  }

  if (!result.length) throw new Error('No MEDIC conduct rows were found below the header.');
  return { records: result, warnings: [], monthHint: detectMonthFromWorkbook(workbook) };
}

function parseIcrf(workbook) {
  const sheet = workbook.sheets.find((candidate) => candidate.rows.some((row) =>
    rowText(row).includes('FROM ATMS (SCH X - X COY - ACTIVITY NAME)'),
  ));
  if (!sheet) throw new Error('The ICRF workbook is missing its Activity Name / Resource headers.');

  const records = [];
  let ignoredRedRows = 0;
  const warnings = [];
  for (let r = 4; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r];
    const values = row?.values || [];
    if (!values.some((value) => text(value))) continue;
    if (row.hasRedFill) {
      ignoredRedRows += 1;
      continue;
    }

    const activity = text(values[0]);
    const reporting = text(values[8]);
    const companyCodes = companyCodesFrom(activity);
    const codes = companyCodes.length ? companyCodes : companyCodesFrom(reporting);
    const date = parseDateValue(values[4]);
    const endDate = parseDateValue(values[6]) || date;
    if (!activity && !values[1] && !date) continue;
    records.push(...makeRecords({
      type: 'ICRF',
      rowNumber: r + 1,
      companyCodes: codes,
      activity,
      date,
      endDate,
      startTime: parseTimeValue(values[5]),
      endTime: parseTimeValue(values[7]),
      resource: text(values[1]),
      quantity: parseNumber(values[2]),
      requiredTo: parseNumber(values[3]),
      reporting,
      remarks: text(values[13]),
      reference: text(values[14]),
    }));
  }

  if (!records.length && !ignoredRedRows) throw new Error('No ICRF vehicle rows were found below the headers.');
  if (ignoredRedRows) warnings.push(`${ignoredRedRows} red-highlighted ICRF row${ignoredRedRows === 1 ? '' : 's'} excluded.`);
  return { records, warnings, ignoredRedRows, monthHint: detectMonthFromWorkbook(workbook) };
}

function findTroopLiftHeader(sheet) {
  return sheet.rows.findIndex((row) => hasWords(row, [
    'COY/UNIT', 'PURPOSE', 'PICK-UP POINT TO DROP-OFF POINT', 'NO. OF BUSES',
  ]));
}

function parseTroopLift(workbook) {
  const sheet = workbook.sheets.find((candidate) => findTroopLiftHeader(candidate) >= 0);
  if (!sheet) throw new Error('The Troop Lift workbook is missing its COY/UNIT, PURPOSE, route, or bus headers.');

  const headerIndex = findTroopLiftHeader(sheet);
  const headers = sheet.rows[headerIndex].values.map((value) => normalized(value));
  const index = (name) => headers.indexOf(name);
  const records = [];

  for (let r = headerIndex + 1; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r].values;
    if (!row?.some((value) => text(value))) continue;
    const activity = text(row[index('PURPOSE')]);
    const date = parseDateValue(row[index('DATE')]);
    const companyValue = row[index('COY/UNIT')];
    if (!activity && !date) continue;

    records.push(...makeRecords({
      type: 'TROOP_LIFT',
      rowNumber: r + 1,
      companyCodes: companyCodesFrom(companyValue),
      activity,
      date,
      time: parseTimeValue(row[index('TIME')]),
      route: text(row[index('PICK-UP POINT TO DROP-OFF POINT')]),
      busCount: parseNumber(row[index('NO. OF BUSES')]),
      remarks: text(row[index('REMARKS')]),
      supportedBusCount: parseNumber(row[index('NO. OF BUSES SUPPORTED')]),
      companyRaw: text(companyValue),
    }));
  }

  if (!records.length) throw new Error('No Troop Lift rows were found below the headers.');
  return { records, warnings: [], monthHint: detectMonthFromWorkbook(workbook) };
}

export function parseWorkbookAsType(workbook, type) {
  if (type === 'ICRF') return parseIcrf(workbook);
  if (type === 'MEDIC') return parseMedic(workbook);
  if (type === 'TROOP_LIFT') return parseTroopLift(workbook);
  throw new Error('Choose ICRF, MEDIC, or Troop Lift for this workbook.');
}

function getMonthFromRecords(sources, fallbackMonth) {
  const counts = new Map();
  const hints = new Map();
  for (const source of Object.values(sources)) {
    if (source?.monthHint) hints.set(source.monthHint, (hints.get(source.monthHint) || 0) + 1);
    for (const record of source?.records || []) {
      const date = record.date || record.endDate;
      if (!date) continue;
      const key = date.slice(0, 7);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
    [...hints.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackMonth || '';
}

function recordsForSchool(sources, schoolId, fallbackMonth) {
  const month = getMonthFromRecords(sources, fallbackMonth);
  const records = [];
  for (const source of Object.values(sources)) {
    for (const record of source?.records || []) {
      const date = record.date || (record.dayNumber && month
        ? `${month}-${String(record.dayNumber).padStart(2, '0')}`
        : '');
      if (record.companyCode && schoolId !== 'HQ' && companySchool(record.companyCode) !== schoolId) continue;
      if (!record.companyCode && schoolId !== 'HQ' && normalized(record.companyRaw) === 'HQ') continue;
      records.push({ ...record, resolvedDate: date, endDate: record.endDate || date });
    }
  }
  return { records, month };
}

function isPrepark(record) {
  return /PREPARK/i.test(record.activity) || /PREPARK/i.test(record.remarks);
}

function dayOffset(date, offset) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function blockId(companyCode, conductKey, firstDate, lastDate) {
  return `${companyCode}|${conductKey}|${firstDate}|${lastDate}`;
}

function buildBlocks(records) {
  const grouped = new Map();
  const prepRecords = [];
  for (const record of records) {
    if (!record.companyCode || !record.conductKey || !record.resolvedDate) continue;
    if (record.sourceType === 'ICRF' && isPrepark(record)) {
      prepRecords.push(record);
      continue;
    }
    const key = `${record.companyCode}|${record.conductKey}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }

  const blocks = [];
  for (const [key, items] of grouped) {
    const dateSet = new Set();
    for (const item of items) {
      let current = item.resolvedDate;
      const end = item.endDate || current;
      let safety = 0;
      while (current && current <= end && safety < 32) {
        dateSet.add(current);
        current = dayOffset(current, 1);
        safety += 1;
      }
    }
    const sortedDates = [...dateSet].sort();
    let cluster = [];
    const clusters = [];
    for (const date of sortedDates) {
      if (cluster.length && date > dayOffset(cluster[cluster.length - 1], 1)) {
        clusters.push(cluster);
        cluster = [];
      }
      cluster.push(date);
    }
    if (cluster.length) clusters.push(cluster);

    for (const dates of clusters) {
      const [companyCode, conductKey] = key.split('|');
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const assigned = items.filter((item) =>
        item.resolvedDate <= lastDate && (item.endDate || item.resolvedDate) >= firstDate,
      );
      blocks.push({
        id: blockId(companyCode, conductKey, firstDate, lastDate),
        companyCode,
        conductKey,
        conductLabel: assigned.find((item) => item.conductLabel)?.conductLabel || conductKey,
        startDate: firstDate,
        endDate: lastDate,
        records: assigned,
      });
    }
  }

  for (const prep of prepRecords) {
    const target = blocks
      .filter((block) => block.companyCode === prep.companyCode && block.conductKey === prep.conductKey)
      .find((block) => prep.resolvedDate === dayOffset(block.startDate, -1));
    if (target) target.records.push(prep);
  }

  return blocks.sort((a, b) =>
    a.companyCode.localeCompare(b.companyCode) ||
    a.startDate.localeCompare(b.startDate) ||
    a.conductLabel.localeCompare(b.conductLabel),
  );
}

function recordBelongsToBlock(record, block) {
  if (record.companyCode !== block.companyCode) return false;
  if (record.conductKey && record.conductKey === block.conductKey) {
    if (record.sourceType === 'ICRF' && isPrepark(record) && record.resolvedDate === dayOffset(block.startDate, -1)) {
      return true;
    }
    return record.resolvedDate <= block.endDate && (record.endDate || record.resolvedDate) >= block.startDate;
  }
  return false;
}

function formatTime(value) {
  return text(value).replace(':', '');
}

function timeRange(record) {
  const start = formatTime(record.startTime);
  const end = formatTime(record.endTime);
  if (!start && !end) return '';
  return `${start || '—'}${end ? `-${end}` : ''}`;
}

function ammoLine(conductKey) {
  if (conductKey === 'BTP') return '• AMMO: (BALL- ) (TRACER- ) [STO No. ]';
  if (conductKey === 'IFC') return '• AMMO: (5.56 BLANK- ) (7.62 BLANK- ) (TRIP FLARE- ) (SMOKE- ) [STO No. ]';
  if (conductKey === 'BIC') return '• AMMO: (5.56 BLANK- ) (7.62 BALL- ) [STO No. ]';
  return '';
}

function formatBlockLines(block, allRecords) {
  const attached = [...new Map([
    ...block.records,
    ...allRecords.filter((record) => recordBelongsToBlock(record, block)),
  ].map((record) => [record.id, record])).values()];
  const lines = [];
  const ammo = ammoLine(block.conductKey);
  if (ammo) lines.push(ammo);

  const medicRows = attached.filter((record) => record.sourceType === 'MEDIC');
  const vehicleRows = attached.filter((record) => record.sourceType === 'ICRF');
  const busRows = attached.filter((record) => record.sourceType === 'TROOP_LIFT');
  const multiDay = block.startDate !== block.endDate;

  for (const medic of medicRows) {
    const vehiclesOnDay = vehicleRows.filter((record) =>
      record.resolvedDate === medic.resolvedDate && /^(SOUV|F550)$/i.test(record.resource),
    );
    const vehicle = vehiclesOnDay[0]?.resource;
    const prefix = multiDay ? `${formatDDMMYY(medic.resolvedDate)} ` : '';
    lines.push(`• Medic${vehicle ? `, ${vehicle}` : ''} ${prefix}${formatTime(medic.startTime)}`.trim());
  }

  for (const row of vehicleRows.filter(isPrepark)) {
    lines.push(`• ${row.resource || 'Vehicle'} (Prepark: ${formatDDMMYY(row.resolvedDate)}, ${timeRange(row) || '—'})`);
  }

  const luvRows = vehicleRows.filter((row) => /\bLUV\b/i.test(row.resource));
  const draws = luvRows.filter((row) => /\bDRAW\b/i.test(row.activity));
  const returns = luvRows.filter((row) => /\bRETURN\b/i.test(row.activity));
  if (draws.length || returns.length) {
    const draw = draws.map((row) => `${multiDay ? `${formatDDMMYY(row.resolvedDate)} ` : ''}${formatTime(row.startTime)}`).filter(Boolean).join(', ');
    const returned = returns.map((row) => `${multiDay ? `${formatDDMMYY(row.resolvedDate)} ` : ''}${formatTime(row.endTime || row.startTime)}`).filter(Boolean).join(', ');
    lines.push(`• LUV (Ammo)${draw ? ` for DRAW ${draw}` : ''}${returned ? `${draw ? ',' : ' for'} RETURN ${returned}` : ''}`);
  }

  const otherVehicleRows = vehicleRows.filter((row) =>
    !isPrepark(row) && !(/\bLUV\b/i.test(row.resource) && /\b(?:DRAW|RETURN)\b/i.test(row.activity)),
  );
  const extraVehicleRows = otherVehicleRows.filter((row) => {
    if (block.conductKey.startsWith('CUSTOM:')) return true;
    if (!row.conductKey || row.conductKey !== block.conductKey) return true;
    return /TRANSITION|AMMO\s+VEH/i.test(row.activity);
  });
  for (const row of extraVehicleRows) {
    const detail = activityText(row.activity) || row.activity;
    lines.push(`• ${row.resource || 'Vehicle'} (${detail})${row.resolvedDate ? ` ${formatDDMMYY(row.resolvedDate)}` : ''}${timeRange(row) ? ` ${timeRange(row)}` : ''}`);
  }

  const busRecords = busRows.filter((row) => row.busCount > 0);
  const tonnerRecords = busRows.filter((row) => row.busCount === 0 && row.remarks);
  if (busRecords.length) {
    lines.push('• Troop Lift (bus):');
    for (const row of busRecords) {
      const date = multiDay ? `${formatDDMMYY(row.resolvedDate)} ` : '';
      lines.push(`  ${date}${formatTime(row.time)}\t${row.activity}\t${row.route}\t${row.busCount}x`);
    }
  }
  if (tonnerRecords.length) {
    lines.push('• Troop Lift (tonners):');
    for (const row of tonnerRecords) {
      const date = multiDay ? `${formatDDMMYY(row.resolvedDate)} ` : '';
      lines.push(`  ${date}${formatTime(row.time)}\t${row.activity}\t${row.route}\t${row.remarks}`);
    }
  }

  return lines;
}

function blockTitle(block) {
  const range = block.startDate === block.endDate
    ? formatDDMMYY(block.startDate)
    : `${formatDDMMYY(block.startDate)}–${formatDDMMYY(block.endDate)}`;
  return `${range} ${block.conductLabel}`;
}

export function buildImportedSummary(sources, assignments = {}, schoolId = 'HQ', fallbackMonth = '') {
  const { records, month } = recordsForSchool(sources, schoolId, fallbackMonth);
  const blocks = buildBlocks(records);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const assignedRecordIds = new Set();

  for (const record of records) {
    const assignedBlock = assignments[record.id] ? blockById.get(assignments[record.id]) : null;
    if (assignedBlock && assignedBlock.companyCode === record.companyCode) {
      assignedBlock.records.push(record);
      assignedRecordIds.add(record.id);
      continue;
    }
    const matchingBlock = blocks.find((block) => recordBelongsToBlock(record, block));
    if (matchingBlock) assignedRecordIds.add(record.id);
  }

  const companyBlocks = new Map();
  for (const block of blocks) {
    if (!companyBlocks.has(block.companyCode)) companyBlocks.set(block.companyCode, []);
    const lines = formatBlockLines(block, records);
    const heading = blockTitle(block);
    companyBlocks.get(block.companyCode).push(lines.length ? `${heading}\n${lines.join('\n')}` : heading);
  }

  const summaries = COMPANIES
    .filter((company) => schoolId === 'HQ' || company.school === schoolId)
    .map((company) => {
      const blocksForCompany = companyBlocks.get(company.code) || [];
      if (!blocksForCompany.length) return null;
      return {
        companyCode: company.code,
        companyName: company.name,
        text: `**${company.name} COY INDENT UPDATE**\n\n${blocksForCompany.join('\n\n')}`,
      };
    })
    .filter(Boolean);

  const review = records.filter((record) => !assignedRecordIds.has(record.id));
  const candidateBlocks = (record) => blocks.filter((block) => {
    if (record.companyCode !== block.companyCode) return false;
    const prepDate = record.sourceType === 'ICRF' && isPrepark(record)
      ? dayOffset(block.startDate, -1)
      : null;
    return (record.resolvedDate >= block.startDate && record.resolvedDate <= block.endDate) || record.resolvedDate === prepDate;
  });

  return {
    summaries,
    review: review.map((record) => ({
      ...record,
      candidateBlocks: candidateBlocks(record).map((block) => ({ id: block.id, label: `${companyName(block.companyCode)} — ${blockTitle(block)}` })),
    })),
    month,
  };
}
