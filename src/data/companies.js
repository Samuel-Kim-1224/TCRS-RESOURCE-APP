// SCH2 companies and their written-out names.
export const COMPANIES = [
  { code: 'J', name: 'JAGUAR', color: '#0d9488' },
  { code: 'K', name: 'KESTREL', color: '#d97706' },
  { code: 'L', name: 'LEOPARD', color: '#16a34a' },
  { code: 'M', name: 'MOHAWK', color: '#2563eb' },
  { code: 'N', name: 'NINJA', color: '#9333ea' },
  { code: 'O', name: 'ORION', color: '#e11d48' },
];

export const companyName = (code) =>
  COMPANIES.find((c) => c.code === code)?.name ?? code;

export const companyColor = (code) =>
  COMPANIES.find((c) => c.code === code)?.color ?? '#d97706';
