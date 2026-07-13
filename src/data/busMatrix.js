// Travel time matrix (minutes) between bus/troop-lift locations.
// Source: EDIT02 spec bus timing table.

export const MTL = 'MTL';
export const HG_RANGE = 'HG Range';
export const BIC_RANGE = 'BIC Range';
export const RANGE_100M = '100m Range';

const LOCATIONS = [
  MTL,
  'RHC',
  BIC_RANGE,
  '300m Range',
  'CCO',
  RANGE_100M,
  'Sitest Site 1',
  'Sitest Site 2',
  ...Array.from({ length: 11 }, (_, i) => `FC Site ${i + 1}`),
  'FIBUA',
  'Eastern Pier',
];

// Raw matrix rows from spec (symmetric lookup).
const MATRIX_RAW = {
  MTL: [0, 15, 15, 15, 15, 20, 20, 20, 5, 10, 25, 25, 30, 30, 25, 25, 20, 20, 25, 30, 30],
  RHC: [15, 0, 10, 10, 5, 10, 10, 10, 20, 20, 15, 20, 25, 20, 15, 15, 10, 10, 10, 20, 20],
  'BIC Range': [15, 10, 0, 0, 5, 10, 10, 10, 20, 20, 15, 20, 25, 20, 15, 15, 10, 10, 10, 20, 20],
  '300m Range': [15, 10, 0, 0, 5, 10, 10, 10, 20, 20, 15, 20, 25, 20, 15, 15, 10, 10, 10, 20, 20],
  CCO: [15, 5, 5, 5, 0, 5, 10, 10, 20, 20, 15, 20, 25, 20, 15, 15, 10, 10, 10, 20, 20],
  '100m Range': [20, 10, 10, 10, 5, 0, 5, 5, 25, 25, 15, 15, 20, 15, 15, 10, 5, 5, 5, 15, 15],
  'Sitest Site 1': [20, 10, 10, 10, 10, 5, 0, 5, 25, 25, 15, 20, 25, 20, 20, 15, 10, 5, 5, 20, 25],
  'Sitest Site 2': [20, 10, 10, 10, 10, 5, 5, 0, 25, 25, 15, 20, 25, 20, 20, 15, 5, 5, 5, 20, 20],
  'FC Site 1': [5, 20, 20, 20, 20, 25, 25, 25, 0, 5, 15, 25, 25, 25, 25, 25, 25, 25, 25, 25, 30],
  'FC Site 2': [10, 20, 20, 20, 20, 25, 25, 25, 5, 0, 10, 20, 20, 20, 20, 20, 25, 25, 25, 20, 25],
  'FC Site 3': [25, 15, 15, 15, 15, 15, 15, 15, 15, 10, 0, 5, 10, 15, 15, 15, 20, 20, 20, 15, 20],
  'FC Site 4': [25, 20, 20, 20, 20, 15, 20, 20, 25, 20, 5, 0, 5, 10, 10, 10, 20, 20, 20, 10, 15],
  'FC Site 5': [30, 25, 25, 25, 25, 20, 25, 25, 25, 20, 10, 5, 0, 5, 5, 5, 15, 15, 15, 0, 10],
  'FC Site 6': [30, 20, 20, 20, 20, 15, 20, 20, 25, 20, 15, 10, 5, 0, 5, 5, 15, 15, 15, 0, 5],
  'FC Site 7': [25, 15, 15, 15, 15, 15, 20, 20, 25, 20, 15, 10, 5, 5, 0, 5, 15, 15, 15, 5, 10],
  'FC Site 8': [25, 15, 15, 15, 15, 10, 15, 15, 25, 20, 15, 10, 5, 5, 5, 0, 15, 15, 15, 5, 10],
  'FC Site 9': [20, 10, 10, 10, 10, 5, 10, 5, 25, 25, 20, 20, 15, 15, 15, 15, 0, 5, 5, 15, 15],
  'FC Site 10': [20, 10, 10, 10, 10, 5, 5, 5, 25, 25, 20, 20, 15, 15, 15, 15, 5, 0, 5, 15, 20],
  'FC Site 11': [25, 10, 10, 10, 10, 5, 5, 5, 25, 25, 20, 20, 15, 15, 15, 15, 5, 5, 0, 15, 25],
  FIBUA: [30, 20, 20, 20, 20, 15, 20, 20, 25, 20, 15, 10, 0, 0, 5, 5, 15, 15, 15, 0, 5],
  'Eastern Pier': [30, 20, 20, 20, 20, 15, 25, 20, 30, 25, 20, 15, 10, 5, 10, 10, 15, 20, 25, 5, 0],
};

const matrix = {};
for (const from of LOCATIONS) {
  matrix[from] = {};
  const row = MATRIX_RAW[from];
  LOCATIONS.forEach((to, i) => {
    matrix[from][to] = row[i];
  });
}

/** Travel minutes from A to B. */
export function travelMinutes(from, to) {
  if (from === to) return 0;
  return matrix[from]?.[to] ?? matrix[to]?.[from] ?? 30;
}

/** Gap between two 4-bus departures = 2 × one-way travel time. */
export function busGapMinutes(from, to) {
  return travelMinutes(from, to) * 2;
}

/** Add minutes to HH:MM time string. */
export function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Map BTP range selection to matrix location. */
export function btpRangeLocation(btpRange) {
  return RANGE_100M;
}

/** Uppercase route label for spreadsheet. */
export function routeLabel(from, to) {
  return `${from.toUpperCase()} - ${to.toUpperCase()}`;
}
