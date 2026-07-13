// SCH2 companies and their written-out names.
export const COMPANIES = [
  { code: 'J', name: 'JAGUAR' },
  { code: 'K', name: 'KESTREL' },
  { code: 'L', name: 'LEOPARD' },
  { code: 'M', name: 'MOHAWK' },
  { code: 'N', name: 'NINJA' },
  { code: 'O', name: 'ORION' },
];

export const companyName = (code) =>
  COMPANIES.find((c) => c.code === code)?.name ?? code;
