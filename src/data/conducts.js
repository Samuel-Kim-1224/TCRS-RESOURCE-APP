// ---------------------------------------------------------------------------
// Conduct catalogue
// ---------------------------------------------------------------------------
// category drives which TIMINGS block applies and whether AM/PM is selectable.
//   normal      -> AM 0600-1100 / PM 1530-2000, AM/PM required
//   highkey     -> full day 0515-2000, no AM/PM selection
//   highkeyExc  -> full day 0515-2359 (BTP), no AM/PM selection
//   special1    -> AM 0600-1300 / PM 1100-2000, AM/PM required (DAC, WP)
//   special2    -> fixed prepark-style span, no AM/PM (BPK)
//   special3    -> AM 0500-1100 / PM 1530-2000, AM/PM required (IPPT)
// ---------------------------------------------------------------------------

import { addDays, dateRange } from '../utils/dateUtils.js';

export const TIMINGS = {
  normal: { AM: ['06:00', '11:00'], PM: ['15:30', '20:00'] },
  highkey: { FULL: ['05:15', '20:00'] },
  highkeyExc: { FULL: ['05:15', '23:59'] },
  special1: { AM: ['06:00', '13:00'], PM: ['11:00', '20:00'] },
  special3: { AM: ['05:00', '11:00'], PM: ['15:30', '20:00'] },
  // special2 (BPK) is computed directly from dates, see rulesEngine.js
};

export const SOC_PES_OPTIONS = ['BP', 'Non-BP'];

export const BTP_RANGE_OPTIONS = ['100m Range I', '100m Range II'];

export const FC_SITE_OPTIONS = Array.from({ length: 11 }, (_, i) => `FC Site ${i + 1}`);

export const SITTEST_SITE_OPTIONS = ['Sittest Site 1', 'Sittest Site 2'];

export const CONDUCTS = [
  { key: 'SOC', label: 'SOC', category: 'normal', subFields: ['socPes'] },
  {
    key: 'RM',
    label: 'RM',
    category: 'normal',
    subFields: ['rmKm', 'rmPes'],
  },
  { key: 'ER', label: 'ER', category: 'normal', subFields: ['erNumber', 'venue'] },
  { key: 'CC', label: 'CC', category: 'normal', subFields: ['ccNumber'] },
  {
    key: 'BTP',
    label: 'BTP',
    category: 'highkeyExc',
    multiDay: true,
    fixedDays: 2,
    subFields: ['btpRange'],
  },
  { key: 'DAC', label: 'DAC', category: 'special1' },
  { key: 'WP', label: 'WP', category: 'special1' },
  { key: 'BPK', label: 'BPK', category: 'special2' },
  { key: 'IPPT', label: 'IPPT', category: 'special3', subFields: ['venue'] },
  { key: 'BIC', label: 'BIC', category: 'highkey', busSession: true },
  { key: 'ISAD', label: 'ISAD', category: 'highkey' },
  { key: 'HG', label: 'HG', category: 'highkey' },
  {
    key: 'IFC',
    label: 'IFC',
    category: 'highkey',
    multiDay: true,
    fixedDays: 5,
    subFields: ['fcSite', 'sitTestSite'],
  },
  { key: 'RE_IFC', label: 're-IFC', category: 'calendarOnly', calendarOnly: true },
  { key: 'RE_SIT', label: 're-SIT test', category: 'calendarOnly', calendarOnly: true },
];

export const conductDef = (key) => CONDUCTS.find((c) => c.key === key);

export const RM_KM_OPTIONS = ['2', '3-4', '6', '8', '12+'];
export const RM_PES_OPTIONS = ['BP', 'BMT/PTP', 'B3', 'B4'];
export const ER_NUMBER_OPTIONS = ['5', '6', '7', '8'];
export const CC_NUMBER_OPTIONS = ['1', '2'];

export const VENUE_OPTIONS = ['Stadium', 'Ladang', 'Eliss 1', 'J-track', 'Eliss 2'];
export const COVERED_VENUES = ['Stadium', 'Ladang', 'Eliss 1'];

export const HIGHKEY_KEYS = ['BTP', 'BIC', 'ISAD', 'HG', 'IFC'];
export const BTP_KEYS = ['BTP'];
export const BUS_CONDUCT_KEYS = ['BTP', 'HG', 'IFC', 'BIC', 'ISAD'];

// Conducts for which the AM/PM toggle is applicable at all.
export const AMPM_ENABLED_CATEGORIES = ['normal', 'special1', 'special3'];

/** Day index (0-based) within a multi-day conduct for a given ISO date. */
export function conductDayIndex(entry, dayIso) {
  const days = dateRange(entry.date, entry.endDate || entry.date);
  return days.indexOf(dayIso);
}

/** Location string shown on calendar chips. */
export function conductLocation(entry, dayIso) {
  switch (entry.conductKey) {
    case 'BTP':
      return entry.btpRange || '';
    case 'IFC': {
      const idx = conductDayIndex(entry, dayIso);
      if (idx === 4) return entry.sitTestSite || '';
      return entry.fcSite || '';
    }
    case 'ER':
    case 'IPPT':
      return entry.venue || '';
    default:
      return '';
  }
}

/** Human-readable label used as the conduct name in generated spreadsheet rows. */
export function conductDisplayName(entry, dayIso) {
  switch (entry.conductKey) {
    case 'RM':
      return `RM ${entry.rmKm}KM ${entry.rmPes}`;
    case 'ER':
      return `ER${entry.erNumber}`;
    case 'CC':
      return `CC${entry.ccNumber}`;
    case 'BTP': {
      if (dayIso) {
        const idx = conductDayIndex(entry, dayIso);
        if (idx === 0) return 'BTP btp1';
        if (idx === 1) return 'BTP btp2';
      }
      return 'BTP';
    }
    case 'IFC': {
      if (dayIso) {
        const idx = conductDayIndex(entry, dayIso);
        if (idx === 4) return 'SIT test';
      }
      return 'IFC';
    }
    case 'RE_IFC':
      return 're-IFC';
    case 'RE_SIT':
      return 're-SIT test';
    case 'BPK':
      return 'BPK';
    default:
      return entry.conductKey;
  }
}

/** Compute end date from fixedDays when applicable. */
export function computeEndDate(entry) {
  const def = conductDef(entry.conductKey);
  if (def?.fixedDays && entry.date) {
    return addDays(entry.date, def.fixedDays - 1);
  }
  return entry.endDate || entry.date;
}
