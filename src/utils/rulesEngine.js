import {
  conductDef,
  conductDisplayName,
  TIMINGS,
  COVERED_VENUES,
  BTP_KEYS,
} from '../data/conducts.js';
import { dateRange, previousWorkingDay } from './dateUtils.js';

const RM_TABLE = {
  '2': { BP: [], 'BMT/PTP': [], B3: [], B4: [] },
  '3-4': { BP: ['F550'], 'BMT/PTP': [], B3: ['F550'], B4: ['F550'] },
  '6': { BP: [], 'BMT/PTP': [], B3: ['F550'], B4: [] },
  '8': { BP: ['F550', 'Medic'], 'BMT/PTP': ['SOUV', 'Medic'], B3: ['F550', 'Medic'], B4: [] },
  '12+': { BP: ['F550', '5Ton', 'Medic'], 'BMT/PTP': ['SOUV', '5Ton', 'Medic'], B3: [], B4: [] },
};

const ROW_ORDER = { prepark: 0, draw: 1, conduct: 2, return: 3 };

/** Returns { vehicles: string[], medic: boolean } for a given conduct entry. */
function resourcesFor(entry, def, isBMT) {
  switch (entry.conductKey) {
    case 'SOC':
      return entry.socPes === 'BP' ? { vehicles: ['F550'], medic: false } : { vehicles: [], medic: false };

    case 'RM': {
      const list = RM_TABLE[entry.rmKm]?.[entry.rmPes] ?? [];
      return { vehicles: list.filter((v) => v !== 'Medic'), medic: list.includes('Medic') };
    }

    case 'ER':
    case 'IPPT': {
      const covered = COVERED_VENUES.includes(entry.venue);
      const vehicles = covered ? [] : [isBMT ? 'SOUV' : 'F550'];
      return { vehicles, medic: true };
    }

    case 'CC':
      return { vehicles: [], medic: false };

    case 'DAC':
      return { vehicles: [isBMT ? 'SOUV' : 'F550', '5Ton'], medic: false };

    case 'WP':
      return { vehicles: ['MB290'], medic: false };

    case 'BIC':
    case 'ISAD':
    case 'HG':
    case 'IFC':
    case 'BTP':
      return { vehicles: [isBMT ? 'SOUV' : 'F550', '5Ton', 'LUV'], medic: true };

    case 'BPK':
    default:
      return { vehicles: [], medic: false };
  }
}

/**
 * Turns one conduct entry (as captured by the Add Conduct form) into the
 * rows needed for the Vehicle tab and Medic tab.
 */
export function generateIndents(entry) {
  const def = conductDef(entry.conductKey);
  const vehicleRows = [];
  const medicRows = [];

  if (!def || def.calendarOnly || entry.status === 'not conducting') {
    return { vehicleRows, medicRows };
  }

  const isBMT = entry.pes === 'BMT';
  const startDate = entry.date;
  const endDate = entry.endDate || entry.date;
  const period = entry.period;
  const days = dateRange(startDate, endDate);

  let timing = null;
  let periodLabel = '';
  if (def.category === 'normal') {
    timing = TIMINGS.normal[period];
    periodLabel = period;
  } else if (def.category === 'special1') {
    timing = TIMINGS.special1[period];
    periodLabel = period;
  } else if (def.category === 'special3') {
    timing = TIMINGS.special3[period];
    periodLabel = period;
  } else if (def.category === 'highkey' || def.category === 'highkeyExc') {
    timing = TIMINGS[def.category].FULL;
    periodLabel = 'FULL DAY';
  } else if (def.category === 'special2') {
    periodLabel = 'FULL DAY';
  }

  const resources = resourcesFor(entry, def, isBMT);

  for (const day of days) {
    const dayLabel = conductDisplayName(entry, day);
    medicRows.push({
      day,
      period: periodLabel,
      companyCode: entry.companyCode,
      start: resources.medic && timing ? timing[0] : '',
      end: resources.medic && timing ? timing[1] : '',
      conductLabel: dayLabel,
    });
  }

  const mkRow = (vehicleType, sDate, sTime, eDate, opts = {}) => ({
    label: opts.nameSuffix ? `${conductDisplayName(entry)} ${opts.nameSuffix}` : conductDisplayName(entry),
    vehicleType,
    startDate: sDate,
    startTime: sTime,
    endDate: eDate,
    endTime: opts.endTime || '',
    companyCode: entry.companyCode,
    prepark: !!opts.prepark,
    rowKind: opts.rowKind || 'conduct',
    conductStartDate: startDate,
  });

  if (def.category === 'special2') {
    const prepDate = previousWorkingDay(startDate);
    vehicleRows.push(
      mkRow('LUV', prepDate, '16:00', startDate, {
        prepark: true,
        endTime: '17:00',
        rowKind: 'prepark',
        nameSuffix: 'prepark',
      }),
    );
  } else {
    for (const v of resources.vehicles) {
      if (v === '5Ton') {
        const prepDate = previousWorkingDay(startDate);
        vehicleRows.push(
          mkRow('5 TON GS', prepDate, '16:00', startDate, {
            prepark: true,
            rowKind: 'prepark',
          }),
        );
        for (const day of days) {
          vehicleRows.push(
            mkRow('5 TON GS', day, timing[0], day, { rowKind: 'conduct' }),
          );
        }
      } else if (v === 'LUV') {
        for (const day of days) {
          vehicleRows.push(
            mkRow('LUV', day, '05:00', day, { nameSuffix: 'draw', rowKind: 'draw' }),
          );
          const returnStart = '20:00';
          const returnEndTime = BTP_KEYS.includes(entry.conductKey) ? '23:59' : '22:00';
          const row = mkRow('LUV', day, returnStart, day, {
            nameSuffix: 'return',
            rowKind: 'return',
            endTime: returnEndTime,
          });
          vehicleRows.push(row);
        }
      } else {
        const vehicleName = { SOUV: 'SOUV', F550: 'F550', MB290: 'MB290' }[v] || v;
        for (const day of days) {
          vehicleRows.push(
            mkRow(vehicleName, day, timing[0], day, { rowKind: 'conduct' }),
          );
        }
      }
    }
  }

  return { vehicleRows, medicRows };
}

export { ROW_ORDER };
