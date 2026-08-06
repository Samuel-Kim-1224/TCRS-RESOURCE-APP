// Companies across Schools I–IV with per-company colours.

export const SCHOOLS = [
  { id: 'I', label: 'Sch I', color: '#ca8a04' }, // yellow
  { id: 'II', label: 'Sch II', color: '#dc2626' }, // red
  { id: 'III', label: 'Sch III', color: '#16a34a' }, // green
  { id: 'IV', label: 'Sch IV', color: '#2563eb' }, // blue
  { id: 'HQ', label: 'HQ', color: '#475569' }, // slate
];

/** Calendar filter chips — schools with companies only (not HQ). */
export const FILTER_SCHOOLS = SCHOOLS.filter((s) => s.id !== 'HQ');

export const COMPANIES = [
  // School I
  { code: 'A', name: 'ALPHA', school: 'I', color: '#ca8a04' },
  { code: 'B', name: 'BRAVO', school: 'I', color: '#ea580c' },
  { code: 'C', name: 'CHARLIE', school: 'I', color: '#d97706' },
  { code: 'D', name: 'DELTA', school: 'I', color: '#b45309' },
  { code: 'E', name: 'ECHO', school: 'I', color: '#a16207' },
  { code: 'F', name: 'FOXTROT', school: 'I', color: '#854d0e' },
  { code: 'G', name: 'GOLF', school: 'I', color: '#713f12' },
  { code: 'H', name: 'HOTEL', school: 'I', color: '#92400e' },
  // School II
  { code: 'J', name: 'JAGUAR', school: 'II', color: '#0d9488' },
  { code: 'K', name: 'KESTREL', school: 'II', color: '#9333ea' },
  { code: 'L', name: 'LEOPARD', school: 'II', color: '#16a34a' },
  { code: 'M', name: 'MOHAWK', school: 'II', color: '#2563eb' },
  { code: 'N', name: 'NINJA', school: 'II', color: '#db2777' },
  { code: 'O', name: 'ORION', school: 'II', color: '#e11d48' },
  // School III
  { code: 'P', name: 'PAPA', school: 'III', color: '#059669' },
  { code: 'R', name: 'ROMEO', school: 'III', color: '#0d9488' },
  { code: 'S', name: 'SIERRA', school: 'III', color: '#0891b2' },
  { code: 'T', name: 'TANGO', school: 'III', color: '#0284c7' },
  { code: 'U', name: 'UNIFORM', school: 'III', color: '#4d7c0f' },
  { code: 'V', name: 'VICTOR', school: 'III', color: '#65a30d' },
  { code: 'W', name: 'WHISKEY', school: 'III', color: '#15803d' },
  // School IV
  { code: '1st', name: '1ST', school: 'IV', color: '#1d4ed8' },
  { code: '2nd', name: '2ND', school: 'IV', color: '#2563eb' },
  { code: '3rd', name: '3RD', school: 'IV', color: '#3b82f6' },
  { code: '4th', name: '4TH', school: 'IV', color: '#6366f1' },
  { code: '5th', name: '5TH', school: 'IV', color: '#7c3aed' },
  { code: '6th', name: '6TH', school: 'IV', color: '#4f46e5' },
  { code: '7th', name: '7TH', school: 'IV', color: '#4338ca' },
];

/** Allowed company_code values for DB check constraints. */
export const COMPANY_CODES = COMPANIES.map((c) => c.code);

export const companyByCode = (code) => COMPANIES.find((c) => c.code === code);

export const companyName = (code) => companyByCode(code)?.name ?? code;

export const companySchool = (code) => companyByCode(code)?.school ?? null;

export const schoolMeta = (schoolId) => SCHOOLS.find((s) => s.id === schoolId);

export const schoolColor = (schoolId) => schoolMeta(schoolId)?.color ?? '#ca8a04';

export const schoolLabel = (schoolId) => schoolMeta(schoolId)?.label ?? `Sch ${schoolId}`;

function mixTowardWhite(hex, amount) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Saturated company colour. */
export const companyColor = (code) => companyByCode(code)?.color ?? '#ca8a04';

/** Lighter company colour for notes. */
export const companyColorLight = (code) => mixTowardWhite(companyColor(code), 0.45);

/** Very light school wash for other-school chips. */
export const schoolColorLight = (schoolId) => mixTowardWhite(schoolColor(schoolId), 0.78);

export const companiesForSchool = (schoolId) =>
  COMPANIES.filter((c) => c.school === schoolId);

/** Display label for indent rows, e.g. "SCH 2". */
export const schoolUnitLabel = (schoolId) => {
  if (schoolId === 'HQ') return 'HQ';
  const map = { I: '1', II: '2', III: '3', IV: '4' };
  return `SCH ${map[schoolId] ?? schoolId}`;
};
