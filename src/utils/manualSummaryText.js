import { COMPANIES, companySchool, schoolUnitLabel } from '../data/companies.js';
import { formatDDMMYY } from './dateUtils.js';

const AMMO_CONDUCTS = new Set(['ISAD', 'BTP', 'BIC', 'HG', 'IFC']);

function dayMinutes(time) {
  const match = String(time || '').match(/^(\d{2})(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function dateIncludes(event, date) {
  return date >= event.date && date <= (event.endDate || event.date);
}

function cleanKey(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function labelsMatch(left, right) {
  const a = cleanKey(left);
  const b = cleanKey(right);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
}

function timeOverlaps(event, record) {
  const at = dayMinutes(record.startTime || record.time);
  if (at === null) return false;
  return event.icrfRows.some((row) => {
    if (row.date !== record.date || !row.startTime || !row.endTime) return false;
    const start = dayMinutes(row.startTime);
    const end = dayMinutes(row.endTime);
    return start !== null && end !== null && at >= start && at <= end;
  });
}

function candidateScore(event, record) {
  let score = 0;
  if (event.conductKey && record.conductKey && event.conductKey === record.conductKey) score += 100;
  else if (labelsMatch(event.conductName, record.conductName || record.purpose)) score += 70;
  if (timeOverlaps(event, record)) score += 30;
  return score;
}

function findEvent(events, record) {
  const candidates = events.filter((event) =>
    event.companyCode === record.companyCode && dateIncludes(event, record.date),
  );
  if (!candidates.length) return null;
  const ranked = candidates
    .map((event) => ({ event, score: candidateScore(event, record) }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0].score > 0) return ranked[0].event;
  // When labels differ, only use a unique date/company candidate if timing supports it.
  if (candidates.length === 1) {
    const event = candidates[0];
    const hasTimedIcrfRows = event.icrfRows.some((row) =>
      row.date === record.date && row.startTime && row.endTime,
    );
    if (!hasTimedIcrfRows || timeOverlaps(event, record)) return event;
  }
  return null;
}

function canCreateFromTroopPurpose(key) {
  return AMMO_CONDUCTS.has(key) || /^(?:IPPT\d*|RM(?:\s|$)|SOC(?:\s|$)|ER(?:\s|$)|TEMPO(?:\s|$)|CC(?:\s|$)|DAC(?:\s|$)|WP(?:\s|$)|BPK(?:\s|$))/.test(key || '');
}

function eventKey(row) {
  return [row.companyCode, row.date, row.endDate || row.date, row.conductKey || cleanKey(row.conductName)].join('|');
}

function isPreparkRow(row) {
  return /5\s*[- ]?TON/i.test(row.resource || '') && /PREPARK/i.test(row.remarks || '');
}

function getOrCreateEvent(eventsByKey, row, { fromIcrf = false } = {}) {
  const key = eventKey(row);
  if (!eventsByKey.has(key)) {
    eventsByKey.set(key, {
      companyCode: row.companyCode,
      date: row.date,
      endDate: row.endDate || row.date,
      conductKey: row.conductKey,
      conductName: row.conductName || 'Conduct',
      icrfRows: [],
      medics: [],
      trips: [],
      fromIcrf,
    });
  }
  const event = eventsByKey.get(key);
  if (fromIcrf) event.fromIcrf = true;
  return event;
}

function dayDistance(start, end) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

function coalesceMultiDayEvents(events) {
  const ordered = [...events].sort((a, b) =>
    a.companyCode.localeCompare(b.companyCode) ||
    a.conductKey.localeCompare(b.conductKey) ||
    a.date.localeCompare(b.date),
  );
  const merged = [];
  for (const event of ordered) {
    const previous = merged[merged.length - 1];
    const isMultiDayHighkey = event.conductKey === 'IFC' || event.conductKey === 'BTP';
    const sameSeries = previous && previous.companyCode === event.companyCode && previous.conductKey === event.conductKey;
    const nextOrOverlapping = sameSeries && dayDistance(previous.date, event.date) <= dayDistance(previous.date, previous.endDate || previous.date) + 1;
    const maxDays = event.conductKey === 'BTP' ? 2 : 5;
    const combinedDays = sameSeries ? Math.max(
      dayDistance(previous.date, previous.endDate || previous.date),
      dayDistance(previous.date, event.endDate || event.date),
    ) + 1 : Infinity;

    if (isMultiDayHighkey && nextOrOverlapping && combinedDays <= maxDays) {
      previous.endDate = event.endDate > previous.endDate ? event.endDate : previous.endDate;
      previous.icrfRows.push(...event.icrfRows);
      previous.fromIcrf ||= event.fromIcrf;
    } else {
      merged.push({ ...event, icrfRows: [...event.icrfRows], medics: [...event.medics], trips: [...event.trips] });
    }
  }
  return merged;
}

function ammoLine(conductKey) {
  switch (conductKey) {
    case 'BTP': return '• AMMO: (BALL- ) (TRACER- ) [STO No. ]';
    case 'IFC': return '• AMMO: (5.56 BLANK- ) (7.62 BLANK- ) (TRIP FLARE- ) (SMOKE- ) [STO No. ]';
    case 'BIC': return '• AMMO: (5.56 BLANK- ) (7.62 BALL- ) [STO No. ]';
    case 'ISAD':
    case 'HG': return '• AMMO: [AMMO DETAILS] [STO No. ]';
    default: return null;
  }
}

function dateRangeText(event) {
  const start = formatDDMMYY(event.date);
  const end = formatDDMMYY(event.endDate || event.date);
  return start === end ? start : `${start}–${end}`;
}

function vehicleLines(event) {
  const rows = event.icrfRows;
  const lines = [];
  const prepark = rows.filter((row) => /5\s*[- ]?TON/i.test(row.resource) && /PREPARK/i.test(row.remarks));
  for (const row of prepark) {
    const start = row.startTime || '1500';
    const end = row.endTime || '1600';
    lines.push(`• 5 TON GS PREPARK: ${formatDDMMYY(row.date)} ${start} – ${formatDDMMYY(row.endDate || row.date)} ${end}`);
  }

  const reporting = rows.filter((row) => /5\s*[- ]?TON/i.test(row.resource) && !/PREPARK/i.test(row.remarks));
  for (const row of reporting) {
    lines.push(`• 5 TON GS REPORTING: ${formatDDMMYY(row.date)} ${row.startTime || 'HHMM'}`);
  }

  const luvRows = rows.filter((row) => /\bLUV\b/i.test(row.resource));
  const draws = luvRows.filter((row) => /DRAW/i.test(row.activity));
  const returns = luvRows.filter((row) => /RETURN/i.test(row.activity));
  if (draws.length) {
    const drawTime = draws.map((row) => row.startTime).find(Boolean) || '0500';
    const returnRow = returns[returns.length - 1];
    const returnTime = returnRow?.endTime || returnRow?.startTime || '2200';
    let suffix = '';
    if (event.conductKey === 'IFC') suffix = ' FIRST and LAST FC day.';
    else if ((event.endDate || event.date) !== event.date) suffix = ` both Day1,${Math.max(1, (Date.parse(`${event.endDate}T00:00:00Z`) - Date.parse(`${event.date}T00:00:00Z`)) / 86400000 + 1)}`;
    lines.push(`• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime}${suffix}`);
  }
  return lines;
}

function phaseForTrip(trip) {
  const purpose = String(trip.purpose || '').toUpperCase();
  if (/TRANSITION/.test(purpose)) return 'FC SITEST TRANSITION';
  if (/\bRTU\b|RETURN/.test(purpose)) return 'FC RTU';
  return 'FC NMT';
}

function troopLiftLines(event) {
  const trips = event.trips.filter((trip) => trip.quantity > 0 && trip.vehicleType !== 'UNKNOWN');
  if (!trips.length) return [];
  const lines = ['• Troop Lift (BUS/TONNER)'];
  if (event.conductKey === 'IFC') {
    const phases = new Map();
    for (const trip of trips) {
      const key = `${trip.date}|${phaseForTrip(trip)}`;
      (phases.get(key) || phases.set(key, []).get(key)).push(trip);
    }
    for (const key of [...phases.keys()].sort()) {
      const [date, phase] = key.split('|');
      lines.push(`    ${formatDDMMYY(date)} ${phase}`);
      for (const trip of phases.get(key).sort((a, b) => a.time.localeCompare(b.time))) {
        lines.push(`    ${trip.time || 'HHMM'}\t${trip.route}\t${trip.quantity}x`);
      }
      lines.push('');
    }
    while (lines[lines.length - 1] === '') lines.pop();
    return lines;
  }
  for (const trip of trips.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))) {
    const time = trip.timeEnd ? `${trip.time}-${trip.timeEnd}` : trip.time || 'HHMM';
    const purpose = trip.purpose || event.conductName;
    lines.push(`    ${time}\t${purpose}\t${trip.route}\t${trip.quantity}x`);
  }
  return lines;
}

function eventText(event) {
  const header = `${dateRangeText(event)} ${event.conductName}`;
  const lines = [];
  const ammo = ammoLine(event.conductKey);
  if (ammo) lines.push(ammo);

  for (const medic of [...event.medics].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    if (!medic.startTime) continue;
    lines.push(`• Medic, SOUV ${medic.startTime}`);
  }

  lines.push(...vehicleLines(event));
  lines.push(...troopLiftLines(event));
  return lines.length ? `${header}\n${lines.join('\n')}` : header;
}

function tbdLine(record) {
  if (record.kind === 'medic') {
    return `${record.startTime || 'HHMM'} Medic — ${record.conductName || 'Conduct not identified'}`;
  }
  if (record.kind === 'icrf') {
    return `${record.startTime || 'HHMM'} ${record.conductName || record.activity || 'Conduct not identified'}`;
  }
  const vehicle = record.vehicleType === 'UNKNOWN' ? 'vehicle count undetermined' : `${record.quantity} ${record.vehicleType}`;
  return `${record.time || 'HHMM'} ${record.route || 'route unknown'} — ${vehicle}${record.purpose ? ` (${record.purpose})` : ''}`;
}

function formatTbd(records) {
  const byDate = new Map();
  for (const record of records) {
    const date = record.date || 'DATE UNKNOWN';
    (byDate.get(date) || byDate.set(date, []).get(date)).push(record);
  }
  return [...byDate.keys()].sort().map((date) => {
    const label = date === 'DATE UNKNOWN' ? date : formatDDMMYY(date);
    const lines = byDate.get(date).map((record) => `• ${tbdLine(record)}`);
    return `${label}\n${lines.join('\n')}`;
  }).join('\n\n');
}

export function buildManualCompanySummaries(sources = {}, homeSchool) {
  let eventsByKey = new Map();
  const globalTbd = [];
  const companyTbd = new Map();
  const companyEvents = new Map();
  const preparkRows = [];
  const tbdForCompany = (code) => {
    if (!companyTbd.has(code)) companyTbd.set(code, []);
    return companyTbd.get(code);
  };

  for (const row of sources.icrf || []) {
    if (row.companyCode && companySchool(row.companyCode) !== homeSchool) continue;
    if (!row.companyCode) {
      globalTbd.push({ ...row, kind: 'icrf' });
      continue;
    }
    if (isPreparkRow(row)) {
      preparkRows.push(row);
      continue;
    }
    const event = getOrCreateEvent(eventsByKey, row, { fromIcrf: true });
    event.icrfRows.push(row);
  }

  const events = coalesceMultiDayEvents([...eventsByKey.values()]);
  eventsByKey = new Map(events.map((event) => [eventKey(event), event]));
  for (const row of preparkRows) {
    const matches = events
      .filter((event) => event.companyCode === row.companyCode && event.conductKey === row.conductKey)
      .map((event) => ({ event, distance: Math.abs(dayDistance(row.date, event.date)) }))
      .filter(({ distance }) => distance <= 7)
      .sort((a, b) => a.distance - b.distance);
    if (matches.length) {
      matches[0].event.icrfRows.push(row);
    } else {
      const event = getOrCreateEvent(eventsByKey, row, { fromIcrf: true });
      event.icrfRows.push(row);
      if (!events.includes(event)) events.push(event);
    }
  }
  for (const medic of sources.medic || []) {
    if (medic.companyCode && companySchool(medic.companyCode) !== homeSchool) continue;
    if (!medic.companyCode) {
      globalTbd.push({ ...medic, kind: 'medic' });
      continue;
    }
    let event = findEvent(events, medic);
    if (!event) {
      event = getOrCreateEvent(eventsByKey, medic);
      if (!events.includes(event)) events.push(event);
    }
    if (!event.medics.some((item) => item.startTime === medic.startTime && item.conductKey === medic.conductKey)) {
      event.medics.push(medic);
    }
  }

  for (const trip of sources.troopLift || []) {
    if (!trip.companyCode || companySchool(trip.companyCode) !== homeSchool) continue;
    if (!(trip.quantity > 0) || trip.vehicleType === 'UNKNOWN') {
      tbdForCompany(trip.companyCode).push({ ...trip, kind: 'trip' });
      continue;
    }
    let event = findEvent(events, trip);
    const hasSameCompanyDateEvent = events.some((candidate) =>
      candidate.companyCode === trip.companyCode && dateIncludes(candidate, trip.date),
    );
    if (!event && !hasSameCompanyDateEvent && canCreateFromTroopPurpose(trip.conductKey)) {
      event = getOrCreateEvent(eventsByKey, {
        ...trip,
        endDate: trip.date,
        conductName: trip.conductName,
      });
      if (!events.includes(event)) events.push(event);
    }
    if (event) event.trips.push(trip);
    else tbdForCompany(trip.companyCode).push({ ...trip, kind: 'trip' });
  }

  for (const event of events) {
    if (!event.companyCode || companySchool(event.companyCode) !== homeSchool) continue;
    (companyEvents.get(event.companyCode) || companyEvents.set(event.companyCode, []).get(event.companyCode)).push(event);
  }

  const output = COMPANIES
    .filter((company) => company.school === homeSchool)
    .map((company) => {
      const blocks = (companyEvents.get(company.code) || [])
        .sort((a, b) => a.date.localeCompare(b.date) || a.conductName.localeCompare(b.conductName))
        .map(eventText);
      const tbd = tbdForCompany(company.code);
      if (tbd.length) blocks.push(`TO BE DETERMINED\n${formatTbd(tbd)}`);
      if (!blocks.length) return null;
      const text = `**${company.name} COY INDENT UPDATE**\n\n${blocks.join('\n\n')}`;
      return { companyCode: company.code, companyName: company.name, text };
    })
    .filter(Boolean);

  if (globalTbd.length) {
    const label = schoolUnitLabel(homeSchool);
    output.push({
      companyCode: 'TBD',
      companyName: 'TO BE DETERMINED',
      text: `**${label} INDENT UPDATE — TO BE DETERMINED**\n\n${formatTbd(globalTbd)}`,
    });
  }
  return output;
}

export function mergeManualSources(previous = {}, additions = {}) {
  const merged = { ...previous };
  for (const type of ['icrf', 'medic', 'troopLift']) {
    if (Object.prototype.hasOwnProperty.call(additions, type)) {
      const rows = additions[type] || [];
      const seen = new Set();
      merged[type] = rows.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }
  return merged;
}
