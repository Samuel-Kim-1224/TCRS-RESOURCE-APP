// ---------------------------------------------------------------------------
// Conduct catalogue
// ---------------------------------------------------------------------------
// category drives which TIMINGS block applies and whether AM/PM is selectable.
//   normal      -> AM 0600-1100 / PM 1530-2000, AM/PM required
//   highkey     -> full day 0515-2000, no AM/PM selection
//   highkeyExc  -> full day 0515-2359 (BTP), no AM/PM selection
//   special1    -> AM 0600-1300 / PM 1100-2000, AM/PM required (DAC, WP)
//   special2    -> fixed prepark-style span, no AM/PM (BPK2)
//   special3    -> AM 0500-1100 / PM 1530-2000, AM/PM required (IPPT)
// ---------------------------------------------------------------------------

export const TIMINGS = {
  normal: { AM: ['06:00', '11:00'], PM: ['15:30', '20:00'] },
  highkey: { FULL: ['05:15', '20:00'] },
  highkeyExc: { FULL: ['05:15', '23:59'] },
  special1: { AM: ['06:00', '13:00'], PM: ['11:00', '20:00'] },
  special3: { AM: ['05:00', '11:00'], PM: ['15:30', '20:00'] },
  // special2 (BPK2) is computed directly from dates, see rulesEngine.js
};

// SOC's resource rule ("BP: F550 ONLY / Non BP: no indent") needs a BP /
// non-BP distinction that isn't otherwise captured by the general BMT /
// Non-BMT toggle, so we add a small dedicated field for it.
// See README "Assumptions".
export const SOC_PES_OPTIONS = ['BP', 'Non-BP'];

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
  { key: 'BTP1', label: 'BTP1', category: 'highkeyExc', multiDay: true },
  { key: 'BTP2', label: 'BTP2', category: 'highkeyExc', multiDay: true },
  { key: 'DAC', label: 'DAC', category: 'special1' },
  { key: 'WP', label: 'WP', category: 'special1' },
  { key: 'BPK2', label: 'BPK2', category: 'special2' },
  { key: 'IPPT', label: 'IPPT', category: 'special3', subFields: ['venue'] },
  { key: 'BIC', label: 'BIC', category: 'highkey' },
  { key: 'ISAD', label: 'ISAD', category: 'highkey' },
  { key: 'HG', label: 'HG', category: 'highkey' },
  { key: 'IFC', label: 'IFC', category: 'highkey' },
];

export const conductDef = (key) => CONDUCTS.find((c) => c.key === key);

export const RM_KM_OPTIONS = ['2', '3-4', '6', '8', '12+'];
export const RM_PES_OPTIONS = ['BP', 'BMT/PTP', 'B3', 'B4'];
export const ER_NUMBER_OPTIONS = ['5', '6', '7', '8'];
export const CC_NUMBER_OPTIONS = ['1', '2'];

// Venue field is not spelled out for ER/IPPT in the source brief beyond the
// medical-coverage rule text (Stadium/Ladang/Eliss 1 = covered,
// J-track/Eliss 2 = not covered). We surface it as an explicit dropdown so
// that rule can actually be evaluated. See README "Assumptions".
export const VENUE_OPTIONS = ['Stadium', 'Ladang', 'Eliss 1', 'J-track', 'Eliss 2'];
export const COVERED_VENUES = ['Stadium', 'Ladang', 'Eliss 1'];

export const HIGHKEY_KEYS = ['BTP1', 'BTP2', 'BIC', 'ISAD', 'HG', 'IFC'];
export const BTP_KEYS = ['BTP1', 'BTP2'];

// Conducts for which the AM/PM toggle is applicable at all.
export const AMPM_ENABLED_CATEGORIES = ['normal', 'special1', 'special3'];

/** Human-readable label used as the conduct name in generated spreadsheet rows. */
export function conductDisplayName(entry) {
  switch (entry.conductKey) {
    case 'RM':
      return `RM ${entry.rmKm}KM ${entry.rmPes}`;
    case 'ER':
      return `ER${entry.erNumber}`;
    case 'CC':
      return `CC${entry.ccNumber}`;
    default:
      return entry.conductKey;
  }
}
