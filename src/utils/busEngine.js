import { conductDef, hasSitTest, normalizeSitTestSite } from '../data/conducts.js';
import { dateRange } from './dateUtils.js';
import {
  MTL,
  HG_RANGE,
  BIC_RANGE,
  RANGE_100M,
  busGapMinutes,
  addMinutes,
  btpRangeLocation,
  routeLabel,
} from '../data/busMatrix.js';

const ISAD_EARLIEST_TIME = '07:00';
// Preserve the existing 4-hour interval from first NMT wave to first RTU wave.
const ISAD_RETURN_OFFSET_MINUTES = 4 * 60;

/**
 * One bus trip row for the Bus / Troop-lift tab.
 * @typedef {{ day: string, time: string, companyCode: string, tripName: string, route: string, buses: string }} BusTrip
 */

function mkTrip(day, time, companyCode, tripName, from, to) {
  return {
    day,
    time,
    companyCode,
    tripName,
    route: routeLabel(from, to),
    buses: '4',
    gap: busGapMinutes(from, to),
  };
}

/** Two 4-bus trips with matrix-derived gap. */
function twoBusTrips(day, baseTime, companyCode, tripName, from, to) {
  const gap = busGapMinutes(from, to);
  return [
    mkTrip(day, baseTime, companyCode, tripName, from, to),
    mkTrip(day, addMinutes(baseTime, gap), companyCode, tripName, from, to),
  ];
}

function btpTrips(entry) {
  const range = btpRangeLocation(entry.btpRange);
  const trips = [];
  const days = dateRange(entry.date, entry.endDate || entry.date);
  days.forEach((day, i) => {
    const suffix = i === 0 ? 'Day 1' : 'Day 2';
    trips.push(mkTrip(day, '07:00', entry.companyCode, 'BTP NMT', MTL, range));
    trips.push(mkTrip(day, '23:59', entry.companyCode, 'BTP RTU', range, MTL));
    trips[trips.length - 2].dayLabel = suffix;
    trips[trips.length - 1].dayLabel = suffix;
  });
  return trips;
}

function hgTrips(entry) {
  const day = entry.date;
  return [
    mkTrip(day, '07:00', entry.companyCode, 'HG Wave1', MTL, HG_RANGE),
    mkTrip(day, '13:00', entry.companyCode, 'HG Wave1 RTU', HG_RANGE, MTL),
    mkTrip(day, '12:20', entry.companyCode, 'HG Wave2', MTL, HG_RANGE),
    mkTrip(day, '17:00', entry.companyCode, 'HG Wave2 RTU', HG_RANGE, MTL),
  ];
}

function ifcTrips(entry) {
  const fcSite = entry.fcSite || 'FC Site 1';
  const sitSite = normalizeSitTestSite(entry.sitTestSite) || 'Sitest Site 1';
  const days = dateRange(entry.date, entry.endDate || entry.date);
  const trips = [];

  if (days[0]) {
    trips.push(...twoBusTrips(days[0], '09:00', entry.companyCode, 'FC NMT', MTL, fcSite));
  }

  if (hasSitTest(entry)) {
    if (days[3]) {
      trips.push(
        ...twoBusTrips(days[3], '15:00', entry.companyCode, 'FC SITTEST TRANSITION', fcSite, sitSite),
      );
    }
    if (days[4]) {
      trips.push(...twoBusTrips(days[4], '16:00', entry.companyCode, 'FC RTU', sitSite, MTL));
    }
  } else if (days[3]) {
    // B3/4: no sit test — RTU from FC site on last FC day
    trips.push(...twoBusTrips(days[3], '16:00', entry.companyCode, 'FC RTU', fcSite, MTL));
  }

  return trips;
}

function bicTrips(entry) {
  const day = entry.date;
  const period = entry.period || 'AM';
  if (period === 'PM') {
    return [
      ...twoBusTrips(day, '11:00', entry.companyCode, 'BIC NMT', MTL, BIC_RANGE),
      ...twoBusTrips(day, '17:00', entry.companyCode, 'BIC RTU', BIC_RANGE, MTL),
    ];
  }
  return [
    ...twoBusTrips(day, '08:00', entry.companyCode, 'BIC NMT', MTL, BIC_RANGE),
    ...twoBusTrips(day, '12:00', entry.companyCode, 'BIC RTU', BIC_RANGE, MTL),
  ];
}

function isadTrips(entry) {
  const day = entry.date;
  const firstWaveTime = ISAD_EARLIEST_TIME;
  const waveGap = busGapMinutes(MTL, RANGE_100M);
  const returnStart = addMinutes(firstWaveTime, ISAD_RETURN_OFFSET_MINUTES);
  return [
    mkTrip(day, firstWaveTime, entry.companyCode, 'ISAD Wave1', MTL, RANGE_100M),
    mkTrip(day, addMinutes(firstWaveTime, waveGap), entry.companyCode, 'ISAD Wave2', MTL, RANGE_100M),
    mkTrip(day, returnStart, entry.companyCode, 'ISAD Wave1 RTU', RANGE_100M, MTL),
    mkTrip(day, addMinutes(returnStart, waveGap), entry.companyCode, 'ISAD Wave2 RTU', RANGE_100M, MTL),
  ];
}

function tripDirection(trip) {
  if (/RTU|RETURN/i.test(trip.tripName)) return 'RTU';
  if (/NMT|WAVE/i.test(trip.tripName)) return 'NMT';
  return trip.tripName;
}

function timeMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function absoluteMinutes(day, time) {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / 60000 + timeMinutes(time);
}

function dayAndTimeFromAbsoluteMinutes(minutes) {
  const date = new Date(minutes * 60000);
  return {
    day: date.toISOString().slice(0, 10),
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
  };
}

function distributeTripsAmongCompanies(entry, trips) {
  const companies = [entry.companyCode, ...(entry.followingCompanyCodes || [])].filter(Boolean);
  if (companies.length < 2) return trips;

  const groups = new Map();
  for (const trip of trips) {
    const tripGroup = entry.conductKey === 'HG' ? trip.tripName : tripDirection(trip);
    const key = `${trip.day}|${tripGroup}`;
    (groups.get(key) || groups.set(key, []).get(key)).push(trip);
  }

  const orderedGroups = [...groups.values()].map((group) => {
    const tripsWithAbsoluteTime = group.map((trip) => ({
      trip,
      time: absoluteMinutes(trip.day, trip.time),
    }));
    return { tripsWithAbsoluteTime, start: Math.min(...tripsWithAbsoluteTime.map(({ time }) => time)) };
  }).sort((a, b) => a.start - b.start);

  const distributed = [];
  let cursor = null;
  for (const { tripsWithAbsoluteTime, start } of orderedGroups) {
    const lastTime = Math.max(...tripsWithAbsoluteTime.map(({ time }) => time));
    const duration = lastTime - start;
    const group = tripsWithAbsoluteTime.map(({ trip }) => trip);
    const routeGap = Math.max(0, ...group.map((trip) => trip.gap || 0));
    const orderedTimes = tripsWithAbsoluteTime.map(({ time }) => time).sort((a, b) => a - b);
    const observedSpacing = orderedTimes.length > 1
      ? Math.max(...orderedTimes.slice(1).map((time, index) => time - orderedTimes[index]))
      : 0;
    const slotGap = Math.max(routeGap, observedSpacing, 1);

    companies.forEach((companyCode, companyIndex) => {
      const candidateStart = start + companyIndex * (duration + slotGap);
      const companyStart = cursor === null
        ? candidateStart
        : Math.max(candidateStart, cursor + slotGap);
      const offset = companyStart - start;
      for (const { trip, time } of tripsWithAbsoluteTime) {
        const scheduled = dayAndTimeFromAbsoluteMinutes(time + offset);
        distributed.push({
          ...trip,
          companyCode,
          ...scheduled,
        });
      }
      cursor = companyStart + duration;
    });
  }

  return distributed.sort((a, b) =>
    a.day.localeCompare(b.day) || a.time.localeCompare(b.time) || a.companyCode.localeCompare(b.companyCode),
  );
}

/** Generate bus/troop-lift trips for the lead and following companies. */
export function generateBusTrips(entry) {
  const def = conductDef(entry.conductKey);
  if (!def || def.calendarOnly) {
    return [];
  }

  let trips;
  switch (entry.conductKey) {
    case 'BTP':
      trips = entry.btpRange ? btpTrips(entry) : [];
      break;
    case 'HG':
      trips = hgTrips(entry);
      break;
    case 'IFC':
      trips = entry.fcSite ? ifcTrips(entry) : [];
      break;
    case 'BIC':
      trips = bicTrips(entry);
      break;
    case 'ISAD':
      trips = isadTrips(entry);
      break;
    default:
      trips = [];
  }

  return distributeTripsAmongCompanies(entry, trips);
}

function tripsConflict(first, second) {
  if (first.day !== second.day) return false;
  const requiredGap = Math.max(first.gap || 0, second.gap || 0);
  return Math.abs(timeMinutes(first.time) - timeMinutes(second.time)) < requiredGap;
}

function scheduleIsadGroup(group, reservations) {
  const baseMinute = Math.min(...group.map((trip) => timeMinutes(trip.time)));
  const earliestMinute = 7 * 60;
  const initialShift = Math.max(0, earliestMinute - baseMinute);
  const duration = Math.max(...group.map((trip) => timeMinutes(trip.time))) - baseMinute;
  const lastShift = 24 * 60 - 1 - (baseMinute + duration);

  for (let shift = initialShift; shift <= lastShift; shift += 5) {
    const candidate = group.map((trip) => ({
      ...trip,
      time: addMinutes(trip.time, shift),
    }));
    if (!candidate.some((trip) => reservations.some((reserved) => tripsConflict(trip, reserved)))) {
      return candidate;
    }
  }

  return group.map((trip) => ({
    ...trip,
    time: 'UNSCHEDULED',
    scheduleWarning: 'No conflict-free ISAD bus slot was available on this date after 07:00.',
  }));
}

/** Generate trips for all entries and stagger ISAD against same-day bus conflicts. */
export function generateBusTripsForConducts(conducts) {
  const entries = conducts.map((entry, entryOrder) => ({
    entry,
    entryOrder,
    trips: generateBusTrips(entry).map((trip) => ({ ...trip, entryOrder })),
  }));
  const fixedTrips = entries
    .filter(({ entry }) => entry.conductKey !== 'ISAD')
    .flatMap(({ trips }) => trips);
  const occupiedByDay = new Map();
  for (const trip of fixedTrips) {
    if (!occupiedByDay.has(trip.day)) occupiedByDay.set(trip.day, []);
    occupiedByDay.get(trip.day).push(trip);
  }

  const isadGroups = new Map();
  for (const { entry, entryOrder, trips } of entries) {
    if (entry.conductKey !== 'ISAD') continue;
    for (const trip of trips) {
      const key = `${entryOrder}|${trip.day}`;
      if (!isadGroups.has(key)) isadGroups.set(key, []);
      isadGroups.get(key).push(trip);
    }
  }

  const scheduledIsad = [];
  const orderedGroups = [...isadGroups.values()].sort((a, b) =>
    a[0].day.localeCompare(b[0].day) || a[0].entryOrder - b[0].entryOrder,
  );
  for (const group of orderedGroups) {
    const day = group[0].day;
    const reservations = occupiedByDay.get(day) || [];
    const scheduled = scheduleIsadGroup(group, reservations);
    scheduledIsad.push(...scheduled);
    occupiedByDay.set(day, [...reservations, ...scheduled]);
  }

  return [
    ...fixedTrips,
    ...scheduledIsad,
  ].sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.time.localeCompare(b.time) ||
    a.entryOrder - b.entryOrder ||
    a.companyCode.localeCompare(b.companyCode),
  );
}

/** Format bus trips as a summary line for indent summary. */
export function formatBusSummaryLine(trips, dayLabel) {
  if (!trips.length) return '';
  const byDay = {};
  for (const t of trips) {
    const key = t.day;
    (byDay[key] ||= []).push(t);
  }
  const lines = [];
  for (const [day, dayTrips] of Object.entries(byDay)) {
    const parts = dayTrips.map((t) => {
      const [from, to] = t.route.split(' - ');
      return `${t.time} ${from}→${to} (x4)`;
    });
    const label = dayLabel || dayTrips[0]?.dayLabel || '';
    lines.push(`• Bus: ${parts.join(', ')}${label ? ` [${label}]` : ''}`);
  }
  return lines.join('\n');
}
