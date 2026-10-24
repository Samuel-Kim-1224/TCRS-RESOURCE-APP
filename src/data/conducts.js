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

export const PES_TYPE_OPTIONS = ['Combat fit', 'B3/4'];

export const SOC_PES_OPTIONS = ['BP', 'Non-BP'];

export const BTP_RANGE_OPTIONS = ['100m Range I', '100m Range II'];

export const FC_SITE_OPTIONS = Array.from({ length: 11 }, (_, i) => `FC Site ${i + 1}`);

export const SITTEST_SITE_OPTIONS = ['Sitest Site 1', 'Sitest Site 2'];

const LEGACY_SITTEST_SITE_NAMES = {
  'Sittest Site 1': 'Sitest Site 1',
  'Sittest Site 2': 'Sitest Site 2',
};

export function normalizeSitTestSite(site) {
  return LEGACY_SITTEST_SITE_NAMES[site] || site || '';
}

export const CONDUCTS = [
  { key: 'SOC', label: 'SOC', category: 'normal', subFields: ['socPes'] },
  {
    key: 'RM',
    label: 'RM',
    category: 'normal',
    subFields: ['rmKm', 'rmPes'],
  },
  { key: 'ER', label: 'ER', category: 'normal', subFields: ['erNumber', 'venue'] },
  {
    key: 'TEMPO',
    label: 'Tempo',
    category: 'normal',
    subFields: ['tempoNumber', 'venue'],
  },
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
  { key: 'IMT', label: 'IMT', category: 'calendarOnly', calendarOnly: true },
  {
    key: 'IPPT',
    label: 'IPPT',
    category: 'special3',
    subFields: ['ipptNumber', 'venue'],
  },
  { key: 'BIC', label: 'BIC', category: 'highkey', busSession: true },
  { key: 'ISAD', label: 'ISAD', category: 'highkey' },
  { key: 'HG', label: 'HG', category: 'highkey' },
  {
    key: 'IFC',
    label: 'IFC',
    category: 'highkey',
    multiDay: true,
    // fixedDays resolved via ifcFixedDays(entry) — Combat fit 5, B3/4 4
    fixedDays: 5,
    subFields: ['fcSite'],
  },
  { key: 'RE_IFC', label: 're-IFC', category: 'calendarOnly', calendarOnly: true },
  { key: 'RE_SIT', label: 're-SIT test', category: 'calendarOnly', calendarOnly: true },
  { key: 'RE_IPPT', label: 're-IPPT', category: 'calendarOnly', calendarOnly: true },
];

export const conductDef = (key) => CONDUCTS.find((c) => c.key === key);

/** Soft fill colours for home-school calendar chips (by conduct type). */
export const CONDUCT_TYPE_COLORS = {
  SOC: '#fde68a',
  RM: '#fed7aa',
  ER: '#bbf7d0',
  TEMPO: '#a7f3d0',
  CC: '#c7d2fe',
  BTP: '#fbcfe8',
  DAC: '#ddd6fe',
  WP: '#e9d5ff',
  BPK: '#f5d0fe',
  IMT: '#d9f99d',
  IPPT: '#bae6fd',
  BIC: '#99f6e4',
  ISAD: '#a5f3fc',
  HG: '#fecdd3',
  IFC: '#fdba74',
  RE_IFC: '#fcd34d',
  RE_SIT: '#f9a8d4',
  RE_IPPT: '#93c5fd',
};

export const conductTypeColor = (key) => CONDUCT_TYPE_COLORS[key] ?? '#e5e7eb';

export const RM_KM_OPTIONS = ['2', '3-4', '6', '8', '12+'];
export const RM_PES_OPTIONS = ['BP', 'BMT/PTP', 'B3', 'B4'];
export const ER_NUMBER_OPTIONS = ['5', '6', '7', '8'];
export const TEMPO_NUMBER_OPTIONS = ['3', '4'];
export const IPPT_NUMBER_OPTIONS = ['1', '2', '3'];
export const CC_NUMBER_OPTIONS = ['1', '2'];

export const VENUE_OPTIONS = ['Stadium', 'Ladang', 'Eliss 1', 'J-track', 'Eliss 2'];
export const COVERED_VENUES = ['Stadium', 'Ladang', 'Eliss 1'];

export const HIGHKEY_KEYS = ['BTP', 'BIC', 'ISAD', 'HG', 'IFC'];
export const BTP_KEYS = ['BTP'];
export const BUS_CONDUCT_KEYS = ['BTP', 'HG', 'IFC', 'BIC', 'ISAD'];

// Conducts for which the AM/PM toggle is applicable at all.
export const AMPM_ENABLED_CATEGORIES = ['normal', 'special1', 'special3'];

/** Combat fit → SOUV path; B3/4 → F550 path (legacy: BMT / Non-BMT). */
export function isCombatFit(entry) {
  return entry?.pes === 'Combat fit' || entry?.pes === 'BMT';
}

/** IFC has a sit-test day only for Combat fit. */
export function hasSitTest(entry) {
  return entry?.conductKey === 'IFC' && isCombatFit(entry);
}

/** IFC: Combat fit = 5 days (4 FC + sit), B3/4 = 4 FC days. */
export function ifcFixedDays(entry) {
  return hasSitTest(entry) ? 5 : 4;
}

/** Resolve fixed-day count for a conduct entry (PES-aware for IFC). */
export function resolveFixedDays(entry) {
  const def = conductDef(entry?.conductKey);
  if (!def?.fixedDays) return null;
  if (entry.conductKey === 'IFC') return ifcFixedDays(entry);
  return def.fixedDays;
}

/** Last FC day index (0-based). With sit test: day 3; without: last day. */
export function ifcLastFcDayIndex(entry) {
  return hasSitTest(entry) ? 3 : ifcFixedDays(entry) - 1;
}

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
      if (hasSitTest(entry) && idx === 4) return entry.sitTestSite || '';
      return entry.fcSite || '';
    }
    case 'ER':
    case 'TEMPO':
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
    case 'TEMPO':
      return `Tempo${entry.tempoNumber}`;
    case 'CC':
      return `CC${entry.ccNumber}`;
    case 'IPPT':
      return entry.ipptNumber ? `IPPT${entry.ipptNumber}` : 'IPPT';
    case 'BTP': {
      if (dayIso) {
        const idx = conductDayIndex(entry, dayIso);
        if (idx === 0) return 'BTP btp1';
        if (idx === 1) return 'BTP btp2';
      }
      return 'BTP';
    }
    case 'IFC': {
      if (dayIso && hasSitTest(entry)) {
        const idx = conductDayIndex(entry, dayIso);
        if (idx === 4) return 'SIT test';
      }
      return 'IFC';
    }
    case 'RE_IFC':
      return 're-IFC';
    case 'RE_SIT':
      return 're-SIT test';
    case 'RE_IPPT':
      return 're-IPPT';
    case 'BPK':
      return 'BPK';
    default:
      return entry.conductKey;
  }
}

/** Compute end date from fixedDays when applicable (PES-aware for IFC). */
export function computeEndDate(entry) {
  const days = resolveFixedDays(entry);
  if (days && entry.date) {
    return addDays(entry.date, days - 1);
  }
  return entry.endDate || entry.date;
}
