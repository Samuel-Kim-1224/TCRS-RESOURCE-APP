import { COMPANIES } from '../data/companies.js';
import { conductDef, conductDisplayName } from '../data/conducts.js';
import { generateIndents } from './rulesEngine.js';
import { generateBusTrips } from './busEngine.js';
import { formatDDMMYY, dateRange, formatDayLabel } from './dateUtils.js';

function conductOverlapsMonth(entry, monthKey) {
  const end = entry.endDate || entry.date;
  return entry.date.slice(0, 7) <= monthKey && end.slice(0, 7) >= monthKey;
}

function formatDateRange(entry) {
  const end = entry.endDate || entry.date;
  if (entry.date === end) return formatDDMMYY(entry.date);
  return `${formatDDMMYY(entry.date)}–${formatDDMMYY(end)}`;
}

function ammoLine(conductKey) {
  if (conductKey === 'BTP') {
    return '• AMMO: (BALL- ) (TRACER- ) [STO No. ]';
  }
  if (conductKey === 'IFC') {
    return '• AMMO: (5.56 BLANK- ) (7.62 BLANK- ) (TRIP FLARE- ) (SMOKE- ) [STO No. ]';
  }
  return null;
}

function medicVehicleLine(entry, vehicleRows, medicRows) {
  const def = conductDef(entry.conductKey);
  if (def?.calendarOnly) return null;
  const medic = medicRows.find((r) => r.start);
  if (!medic) return null;
  const hasSouv = vehicleRows.some((r) => r.vehicleType === 'SOUV' || r.vehicleType === 'F550');
  const vehicle = hasSouv ? (entry.pes === 'BMT' ? 'SOUV' : 'F550') : 'Medic';
  const time = medic.start.replace(':', '');
  if (hasSouv) return `• Medic, ${vehicle} ${time}`;
  return `• Medic ${time}`;
}

function preparkLine(vehicleRows) {
  const prep = vehicleRows.find((r) => r.prepark && r.vehicleType === '5 TON GS');
  if (!prep) return null;
  return `• 5 TON GS (Prepark: ${formatDDMMYY(prep.startDate)}, ${prep.startTime.replace(':', '')})`;
}

function luvLine(entry, vehicleRows) {
  const draws = vehicleRows.filter((r) => r.rowKind === 'draw');
  const returns = vehicleRows.filter((r) => r.rowKind === 'return');
  if (!draws.length) return null;
  const drawTime = draws[0].startTime.replace(':', '');
  const returnTime = (returns[returns.length - 1]?.endTime || returns[returns.length - 1]?.startTime || '2200').replace(':', '');
  const days = dateRange(entry.date, entry.endDate || entry.date);
  if (days.length > 1) {
    return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime} both Day1,${days.length}`;
  }
  if (entry.conductKey === 'IFC') {
    return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime} FIRST and LAST day.`;
  }
  return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime}`;
}

function busLines(entry) {
  const trips = generateBusTrips(entry);
  if (!trips.length) return [];

  const byDay = {};
  for (const t of trips) {
    (byDay[t.day] ||= []).push(t);
  }

  const days = Object.keys(byDay).sort();
  const lines = [];
  const allDays = dateRange(entry.date, entry.endDate || entry.date);

  for (const day of days) {
    const dayTrips = byDay[day];
    const nmt = dayTrips.filter((t) => !t.tripName.includes('RTU') && !t.tripName.includes('TRANSITION'));
    const rtu = dayTrips.filter((t) => t.tripName.includes('RTU') || t.tripName.includes('TRANSITION'));

    const formatLeg = (t) => {
      const [from, to] = t.route.split(' - ');
      return `${t.time} ${from}→${to} (x4)`;
    };

    const dayIdx = allDays.indexOf(day);
    let dayLabel = '';
    if (entry.conductKey === 'BTP') {
      dayLabel = dayIdx === 0 ? 'Day 1' : 'Day 2';
    } else {
      dayLabel = formatDayLabel(day);
    }

    const nmtParts = nmt.map(formatLeg).join(', ');
    const rtuParts = rtu.map(formatLeg).join(', ');
    const twoTrips = nmt.length > 1 || rtu.length > 1;
    const tripNote = twoTrips ? ' TWO TRIPS' : '';

    if (nmtParts && rtuParts) {
      lines.push(`• Bus: ${nmtParts}, ${rtuParts}${tripNote} [${dayLabel}]`);
    } else if (nmtParts) {
      lines.push(`• Bus: ${nmtParts}${tripNote} [${dayLabel}]`);
    } else if (rtuParts) {
      lines.push(`• Bus: ${rtuParts}${tripNote} [${dayLabel}]`);
    }
  }
  return lines;
}

function conductBlock(entry) {
  const def = conductDef(entry.conductKey);
  if (entry.status === 'not conducting') return null;

  const { vehicleRows, medicRows } = generateIndents(entry);
  const lines = [];
  const header = `${formatDateRange(entry)} ${conductDisplayName(entry)}`;

  if (def?.calendarOnly) {
    return header;
  }

  const ammo = ammoLine(entry.conductKey);
  if (ammo) lines.push(ammo);

  const medic = medicVehicleLine(entry, vehicleRows, medicRows);
  if (medic) lines.push(medic);

  const prepark = preparkLine(vehicleRows);
  if (prepark) lines.push(prepark);

  const luv = luvLine(entry, vehicleRows);
  if (luv) lines.push(luv);

  lines.push(...busLines(entry));

  if (!lines.length) {
    const medicOnly = medicVehicleLine(entry, vehicleRows, medicRows);
    if (medicOnly) return `${header}\n${medicOnly}`;
    return header;
  }

  return `${header}\n${lines.join('\n')}`;
}

/** Build per-company CWO update text blocks for the month. */
export function buildCompanySummaries(conducts, monthKey) {
  const inMonth = conducts
    .filter((c) => conductOverlapsMonth(c, monthKey) && c.status !== 'not conducting')
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return COMPANIES.map((company) => {
    const companyConducts = inMonth.filter((c) => c.companyCode === company.code);
    if (!companyConducts.length) return null;

    const blocks = companyConducts.map(conductBlock).filter(Boolean);
    const text = `**${company.name} COY INDENT UPDATE**\n\n${blocks.join('\n\n')}`;
    return { companyCode: company.code, companyName: company.name, text };
  }).filter(Boolean);
}
