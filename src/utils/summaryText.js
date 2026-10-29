import { COMPANIES } from '../data/companies.js';
import { conductDef, conductDisplayName, isCombatFit } from '../data/conducts.js';
import { generateIndents } from './rulesEngine.js';
import { generateBusTripsForConducts } from './busEngine.js';
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
  if (conductKey === 'BIC') {
    return '• AMMO: (5.56 BLANK- ) (7.62 BALL- ) [STO No. ]';
  }
  return null;
}

function medicVehicleLine(entry, vehicleRows, medicRows) {
  const def = conductDef(entry.conductKey);
  if (def?.calendarOnly) return null;
  const medic = medicRows.find((r) => r.start);
  if (!medic) return null;
  const hasSouv = vehicleRows.some((r) => r.vehicleType === 'SOUV' || r.vehicleType === 'F550');
  const vehicle = hasSouv ? (isCombatFit(entry) ? 'SOUV' : 'F550') : 'Medic';
  const time = medic.start.replace(':', '');
  if (hasSouv) return `• Medic, ${vehicle} ${time}`;
  return `• Medic ${time}`;
}

function preparkLines(vehicleRows) {
  return vehicleRows
    .filter((row) => row.prepark)
    .map((row) => {
      const start = row.startTime.replace(':', '');
      const end = (row.endTime || '16:00').replace(':', '');
      return `• ${row.vehicleType} PREPARK: ${formatDDMMYY(row.startDate)} ${start} – ${formatDDMMYY(row.endDate)} ${end}`;
    });
}

function luvLine(entry, vehicleRows) {
  const draws = vehicleRows.filter((r) => r.rowKind === 'draw');
  const returns = vehicleRows.filter((r) => r.rowKind === 'return');
  if (!draws.length) return null;
  const drawTime = draws[0].startTime.replace(':', '');
  const returnTime = (returns[returns.length - 1]?.endTime || returns[returns.length - 1]?.startTime || '2200').replace(':', '');
  if (entry.conductKey === 'IFC') {
    return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime} FIRST and LAST FC day.`;
  }
  const days = dateRange(entry.date, entry.endDate || entry.date);
  if (days.length > 1) {
    return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime} both Day1,${days.length}`;
  }
  return `• LUV (Ammo) for DRAW ${drawTime}, RETURN ${returnTime}`;
}

function busLines(entry, scheduledTrips, companyCode = null) {
  const trips = scheduledTrips.filter((trip) =>
    trip.entryOrder === entry._busEntryOrder && (!companyCode || trip.companyCode === companyCode),
  );
  if (!trips.length) return [];

  const byDay = {};
  for (const t of trips) {
    const key = `${t.day}|${t.companyCode}`;
    (byDay[key] ||= []).push(t);
  }

  const lines = [];
  const allDays = dateRange(entry.date, entry.endDate || entry.date);

  for (const key of Object.keys(byDay).sort()) {
    const [day, company] = key.split('|');
    const dayTrips = byDay[key];
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
      lines.push(`• Bus (${company}): ${nmtParts}, ${rtuParts}${tripNote} [${dayLabel}]`);
    } else if (nmtParts) {
      lines.push(`• Bus (${company}): ${nmtParts}${tripNote} [${dayLabel}]`);
    } else if (rtuParts) {
      lines.push(`• Bus (${company}): ${rtuParts}${tripNote} [${dayLabel}]`);
    }
  }
  return lines;
}

function conductBlock(entry, cwos = {}, selectedBusCompany = null, scheduledTrips = []) {
  const def = conductDef(entry.conductKey);
  if (entry.status === 'not conducting') return null;

  const { vehicleRows, medicRows } = generateIndents(entry, !!cwos[entry.companyCode]?.isMono);
  const lines = [];
  const header = `${formatDateRange(entry)} ${conductDisplayName(entry)}`;

  if (def?.calendarOnly) {
    return header;
  }

  const ammo = ammoLine(entry.conductKey);
  if (ammo) lines.push(ammo);

  const medic = medicVehicleLine(entry, vehicleRows, medicRows);
  if (medic) lines.push(medic);

  lines.push(...preparkLines(vehicleRows));

  const luv = luvLine(entry, vehicleRows);
  if (luv) lines.push(luv);

  lines.push(...busLines(entry, scheduledTrips, selectedBusCompany));

  if (!lines.length) {
    const medicOnly = medicVehicleLine(entry, vehicleRows, medicRows);
    if (medicOnly) return `${header}\n${medicOnly}`;
    return header;
  }

  return `${header}\n${lines.join('\n')}`;
}

/** Build per-company CWO update text blocks for the month. */
export function buildCompanySummaries(conducts, monthKey, cwos = {}) {
  const indexedConducts = conducts.map((conduct, index) => ({ ...conduct, _busEntryOrder: index }));
  const scheduledTrips = generateBusTripsForConducts(indexedConducts);
  const inMonth = indexedConducts
    .filter((c) => conductOverlapsMonth(c, monthKey))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const blocksByCompany = new Map();
  const pushBlock = (companyCode, block) => {
    if (!block) return;
    (blocksByCompany.get(companyCode) || blocksByCompany.set(companyCode, []).get(companyCode)).push(block);
  };

  const legacyEntries = inMonth.filter((item) => item.status === 'not conducting');
  const conductingEntries = inMonth.filter((item) => item.status !== 'not conducting');
  const legacyAttachments = new Map();
  for (const legacy of legacyEntries) {
    const host = conductingEntries.find((conduct) =>
      legacy.companyCode !== conduct.companyCode &&
      legacy.conductKey === conduct.conductKey &&
      legacy.date === conduct.date &&
      (legacy.endDate || legacy.date) === (conduct.endDate || conduct.date),
    );
    if (host) {
      (legacyAttachments.get(host.id) || legacyAttachments.set(host.id, []).get(host.id))
        .push(legacy.companyCode);
    }
  }

  const normalizedEntries = conductingEntries
    .map((conduct) => {
      return {
        ...conduct,
        followingCompanyCodes: [...new Set([
          ...(conduct.followingCompanyCodes || []),
          ...(legacyAttachments.get(conduct.id) || []),
        ])],
      };
    });

  for (const conduct of normalizedEntries) {
    pushBlock(conduct.companyCode, conductBlock(conduct, cwos, null, scheduledTrips));
    for (const followingCompany of conduct.followingCompanyCodes || []) {
      const trips = busLines(conduct, scheduledTrips, followingCompany);
      if (trips.length) {
        const header = `${formatDateRange(conduct)} ${conductDisplayName(conduct)}`;
        pushBlock(followingCompany, `${header}\n${trips.join('\n')}`);
      }
    }
  }

  for (const legacy of legacyEntries) {
    const host = normalizedEntries.find((item) => item.followingCompanyCodes.includes(legacy.companyCode));
    if (!host) {
      pushBlock(legacy.companyCode, conductBlock({ ...legacy, status: 'conducting' }, cwos, null, scheduledTrips));
    }
  }

  return COMPANIES.map((company) => {
    const blocks = blocksByCompany.get(company.code) || [];
    if (!blocks.length) return null;
    const text = `**${company.name} COY INDENT UPDATE**\n\n${blocks.join('\n\n')}`;
    return { companyCode: company.code, companyName: company.name, text };
  }).filter(Boolean);
}
