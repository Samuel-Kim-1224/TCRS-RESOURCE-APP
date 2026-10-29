import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from '@e965/xlsx';
import { parseIndentWorkbook, parsePastedTroopLift } from './manualIndentImport.js';
import { buildManualCompanySummaries, mergeManualSources } from './manualSummaryText.js';

function mockXlsxFile(name, sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }
  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const bytes = output instanceof Uint8Array
    ? output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)
    : output;
  return { name, arrayBuffer: async () => bytes };
}

test('ICRF workbook headers and Excel date/time cells are detected', async () => {
  const file = mockXlsxFile('icrf.xlsx', [[
    'NOV', [
      ['Activity Name', 'Resource', '', '', 'Execution Time', '', '', '', 'Location', '', ''],
      ['', 'Type of Veh', 'Qty', '', 'Start', '', 'End', '', 'Reporting', 'Destination', ''],
      ['', '', '', '', 'Date', 'Time', 'Date', 'Time', '', '', ''],
      ['From ATMS', 'From ATMS'],
      ['SCH 2 - J COY - HG', '5 TON GS', '1', '', '01/11/2026', '05:15', '01/11/2026', '06:00', 'JAGUAR', 'JAGUAR', ''],
    ],
  ]]);
  const parsed = await parseIndentWorkbook(file, { monthKey: '2026-11', homeSchool: 'II' });
  assert.equal(parsed.icrf.length, 1);
  assert.equal(parsed.icrf[0].companyCode, 'J');
  assert.equal(parsed.icrf[0].conductKey, 'HG');
  assert.equal(parsed.icrf[0].date, '2026-11-01');
  assert.equal(parsed.icrf[0].startTime, '0515');
  assert.equal(parsed.icrf[0].endTime, '0600');
});

test('pasted Troop Lift schedules parse dates, routes, counts, ranges, and school codes', () => {
  const pasted = [
    'October TL Schedule',
    '',
    '01/10',
    '0700 MTL - RHC 1 BUSES (E COY GPMG Team)',
    '0730 MTL - HG RANGE 4 BUSES (J HG Wave1)',
    '1000-1130 MTL-MTL 1 BUSES (J IFC RECCEE)',
    '2000 MTL - RHC 4 TONNERS (J BTP RTU)',
    '*2210 MTL - RHC 4 BUSES (J BTP RTU)*',
  ].join('\n');
  const rows = parsePastedTroopLift(pasted, { monthKey: '2026-10', homeSchool: 'II' });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row.companyCode), ['J', 'J', 'J', 'J']);
  assert.equal(rows[0].conductKey, 'HG');
  assert.equal(rows[1].timeEnd, '1130');
  assert.equal(rows[2].vehicleType, 'TONNER');
  assert.equal(rows[3].time, '2210');
  assert.equal(rows[3].date, '2026-10-01');
});

test('pasted Troop Lift schedule month mismatch blocks import', () => {
  assert.throws(
    () => parsePastedTroopLift('October TL Schedule\n\n01/10\n0730 MTL - HG RANGE 4 BUSES (J HG Wave1)', {
      monthKey: '2026-11',
      homeSchool: 'II',
    }),
    /different month|showing November/i,
  );
});

test('pasted Troop Lift company hints include School III letter codes', () => {
  const rows = parsePastedTroopLift('October TL Schedule\n\n01/10\n0700 MTL - RANGE 4 BUSES (P ISAD NMT)\n0730 MTL - RANGE 4 BUSES (R BTP NMT)', {
    monthKey: '2026-10',
    homeSchool: 'III',
  });
  assert.deepEqual(rows.map((row) => row.companyCode), ['P', 'R']);
});

test('manual summaries group known school rows, format IFC trips, and isolate TBD', () => {
  const summaries = buildManualCompanySummaries({
    icrf: [{
      companyCode: 'J', date: '2026-11-07', endDate: '2026-11-07', conductKey: 'HG', conductName: 'HG',
      activity: 'SCH 2 - J COY - HG', resource: 'SOUV', startTime: '0515', endTime: '0600', remarks: '',
    }],
    medic: [{
      companyCode: 'J', date: '2026-11-07', endDate: '2026-11-07', conductKey: 'HG', conductName: 'HG', startTime: '0500',
    }],
    troopLift: [
      { companyCode: 'J', date: '2026-11-07', time: '0730', purpose: 'HG Wave1', route: 'MTL - HG RANGE', quantity: 4, vehicleType: 'BUS', conductKey: 'HG', conductName: 'HG' },
      { companyCode: 'J', date: '2026-11-08', time: '0900', purpose: 'unmatched activity', route: 'MTL - RHC', quantity: 2, vehicleType: 'BUS', conductKey: 'UNMATCHED ACTIVITY', conductName: 'unmatched activity' },
      { companyCode: 'A', date: '2026-11-07', time: '0730', purpose: 'BTP NMT', route: 'MTL - RANGE', quantity: 4, vehicleType: 'BUS', conductKey: 'BTP', conductName: 'BTP' },
    ],
  }, 'II');
  const jaguar = summaries.find((item) => item.companyCode === 'J');
  assert.match(jaguar.text, /071126 HG/);
  assert.match(jaguar.text, /AMMO DETAILS/);
  assert.match(jaguar.text, /Medic, SOUV 0500/);
  assert.match(jaguar.text, /0730\tHG Wave1\tMTL - HG RANGE\t4x/);
  assert.match(jaguar.text, /TO BE DETERMINED[\s\S]*081126/);
  assert.equal(summaries.some((item) => item.companyCode === 'A'), false);
});

test('consecutive ICRF IFC dates render as one multiday conduct block', () => {
  const summaries = buildManualCompanySummaries({
    icrf: [
      { companyCode: 'K', date: '2026-10-31', endDate: '2026-10-31', conductKey: 'IFC', conductName: 'IFC', activity: 'IFC NMT', resource: 'LUV', startTime: '0500', endTime: '0600', remarks: '' },
      { companyCode: 'K', date: '2026-11-01', endDate: '2026-11-01', conductKey: 'IFC', conductName: 'IFC', activity: 'IFC RTU', resource: 'LUV', startTime: '2200', endTime: '2300', remarks: '' },
    ],
    medic: [],
    troopLift: [],
  }, 'II');
  const kestrel = summaries.find((item) => item.companyCode === 'K');
  assert.equal((kestrel.text.match(/311026–011126 IFC/g) || []).length, 1);
  assert.doesNotMatch(kestrel.text, /311026 IFC\n/);
});

test('prepark resource attaches to a following conduct without shifting its title date', () => {
  const summaries = buildManualCompanySummaries({
    icrf: [
      { companyCode: 'K', date: '2026-10-27', endDate: '2026-10-27', conductKey: 'IFC', conductName: 'IFC', activity: 'SCH 2 - K COY - IFC', resource: '5 TON GS', startTime: '1500', endTime: '1600', remarks: 'PREPARK' },
      { companyCode: 'K', date: '2026-10-31', endDate: '2026-10-31', conductKey: 'IFC', conductName: 'IFC', activity: 'SCH 2 - K COY - IFC', resource: 'LUV', startTime: '0500', endTime: '0600', remarks: '' },
    ],
    medic: [],
    troopLift: [],
  }, 'II');
  const kestrel = summaries.find((item) => item.companyCode === 'K');
  assert.match(kestrel.text, /311026 IFC\n• AMMO/);
  assert.match(kestrel.text, /5 TON GS PREPARK: 271026 1500 – 271026 1600/);
  assert.doesNotMatch(kestrel.text, /271026–311026 IFC/);
});

test('updating one source replaces only that source type', () => {
  const previous = { icrf: [{ id: 'old-i' }], medic: [{ id: 'old-m' }], troopLift: [{ id: 'old-t' }] };
  const next = mergeManualSources(previous, { medic: [{ id: 'new-m' }, { id: 'new-m' }] });
  assert.deepEqual(next.icrf, previous.icrf);
  assert.deepEqual(next.troopLift, previous.troopLift);
  assert.deepEqual(next.medic, [{ id: 'new-m' }]);
});
