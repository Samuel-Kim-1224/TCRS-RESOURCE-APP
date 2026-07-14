import { conductDef, hasSitTest } from '../data/conducts.js';
import { dateRange } from './dateUtils.js';
import {
  MTL,
  HG_RANGE,
  BIC_RANGE,
  travelMinutes,
  busGapMinutes,
  addMinutes,
  btpRangeLocation,
  routeLabel,
} from '../data/busMatrix.js';

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
  const sitSite = entry.sitTestSite || 'Sittest Site 1';
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
      mkTrip(day, '11:00', entry.companyCode, 'BIC NMT', MTL, BIC_RANGE),
      mkTrip(day, '17:00', entry.companyCode, 'BIC RTU', BIC_RANGE, MTL),
    ];
  }
  return [
    mkTrip(day, '08:00', entry.companyCode, 'BIC NMT', MTL, BIC_RANGE),
    mkTrip(day, '12:00', entry.companyCode, 'BIC RTU', BIC_RANGE, MTL),
  ];
}

function isadTrips(entry) {
  const day = entry.date;
  return [
    mkTrip(day, '07:00', entry.companyCode, 'ISAD Wave1', MTL, MTL),
    mkTrip(day, '07:40', entry.companyCode, 'ISAD Wave2', MTL, MTL),
    mkTrip(day, '11:00', entry.companyCode, 'ISAD Wave1 RTU', MTL, MTL),
    mkTrip(day, '11:40', entry.companyCode, 'ISAD Wave2 RTU', MTL, MTL),
  ];
}

/** Generate bus/troop-lift trips for one conduct entry. */
export function generateBusTrips(entry) {
  const def = conductDef(entry.conductKey);
  if (!def || def.calendarOnly || entry.status === 'not conducting') {
    return [];
  }

  switch (entry.conductKey) {
    case 'BTP':
      return entry.btpRange ? btpTrips(entry) : [];
    case 'HG':
      return hgTrips(entry);
    case 'IFC':
      return entry.fcSite ? ifcTrips(entry) : [];
    case 'BIC':
      return bicTrips(entry);
    case 'ISAD':
      return isadTrips(entry);
    default:
      return [];
  }
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

// travelMinutes used internally via busGapMinutes
