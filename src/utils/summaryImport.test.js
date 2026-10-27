import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildImportedSummary,
  conductIdentity,
  parseDateValue,
  parseTimeValue,
} from './summaryImport.js';

test('normalizes spreadsheet dates, times, and conduct aliases', () => {
  assert.equal(parseDateValue('1-NOVEMBER-2026'), '2026-11-01');
  assert.equal(parseDateValue(46327), '2026-11-01');
  assert.equal(parseTimeValue(0.8333333333333), '20:00');
  assert.equal(parseTimeValue('0730'), '07:30');
  assert.deepEqual(conductIdentity('SCH 2 - K COY - IFC return', 'ICRF'), { key: 'IFC', label: 'IFC' });
  assert.deepEqual(conductIdentity('IPPT3', 'MEDIC'), { key: 'IPPT', label: 'IPPT' });
  assert.deepEqual(conductIdentity('SCH 2 - J COY - RE 12KM J', 'ICRF'), {
    key: 'CUSTOM:RE 12KM J',
    label: 'RE 12KM J',
  });
});

test('combines a multi-day conduct, keeps duplicate medic rows, and formats bus and tonner entries', () => {
  const sources = {
    ICRF: { records: [] },
    MEDIC: {
      records: [
        { id: 'medic-1', sourceType: 'MEDIC', sourceRow: 2, companyCode: 'J', conductKey: 'HG', conductLabel: 'HG', date: '', dayNumber: 7, startTime: '05:15' },
        { id: 'medic-2', sourceType: 'MEDIC', sourceRow: 3, companyCode: 'J', conductKey: 'HG', conductLabel: 'HG', date: '', dayNumber: 7, startTime: '05:15' },
        { id: 'medic-3', sourceType: 'MEDIC', sourceRow: 4, companyCode: 'J', conductKey: 'HG', conductLabel: 'HG', date: '', dayNumber: 8, startTime: '05:15' },
      ],
      monthHint: '2026-11',
    },
    TROOP_LIFT: {
      records: [
        { id: 'bus-1', sourceType: 'TROOP_LIFT', sourceRow: 4, companyCode: 'J', conductKey: 'HG', conductLabel: 'HG', date: '2026-11-07', time: '07:30', activity: 'HG Wave1', route: 'MTL - HG RANGE', busCount: 4 },
        { id: 'tonner-1', sourceType: 'TROOP_LIFT', sourceRow: 5, companyCode: 'J', conductKey: 'HG', conductLabel: 'HG', date: '2026-11-08', time: '07:30', activity: 'HG Wave2', route: 'MTL - HG RANGE', busCount: 0, remarks: '2x 5-TON' },
      ],
    },
  };

  const { summaries, review } = buildImportedSummary(sources, {}, 'II', '2026-11');
  assert.equal(review.length, 0);
  assert.equal(summaries.length, 1);
  assert.match(summaries[0].text, /071126–081126 HG/);
  assert.equal((summaries[0].text.match(/• Medic 071126 0515/g) || []).length, 2);
  assert.match(summaries[0].text, /• Troop Lift \(bus\):/);
  assert.match(summaries[0].text, /0730\tHG Wave1\tMTL - HG RANGE\t4x/);
  assert.match(summaries[0].text, /• Troop Lift \(tonners\):/);
  assert.match(summaries[0].text, /0730\tHG Wave2\tMTL - HG RANGE\t2x 5-TON/);
});

test('keeps unmatched same-company rows in review and allows assigning them to a covering block', () => {
  const sources = {
    ICRF: {
      records: [
        { id: 'known', sourceType: 'ICRF', sourceRow: 10, companyCode: 'M', conductKey: 'BTP', conductLabel: 'BTP', date: '2026-11-07', endDate: '2026-11-08', activity: 'BTP', resource: 'SOUV', startTime: '05:15', endTime: '20:00' },
        { id: 'extra', sourceType: 'ICRF', sourceRow: 11, companyCode: 'M', conductKey: '', conductLabel: '', date: '2026-11-08', endDate: '2026-11-08', activity: 'Extra vehicle label', resource: 'MB290', startTime: '06:00', endTime: '13:00' },
        { id: 'other-school', sourceType: 'ICRF', sourceRow: 12, companyCode: 'H', conductKey: 'BTP', conductLabel: 'BTP', date: '2026-11-07', endDate: '2026-11-08', activity: 'BTP', resource: 'SOUV' },
      ],
    },
  };

  const initial = buildImportedSummary(sources, {}, 'II', '2026-11');
  assert.equal(initial.summaries.length, 1);
  assert.equal(initial.summaries[0].companyCode, 'M');
  assert.equal(initial.review.length, 1);
  assert.equal(initial.review[0].candidateBlocks.length, 1);

  const blockId = initial.review[0].candidateBlocks[0].id;
  const assigned = buildImportedSummary(sources, { extra: blockId }, 'II', '2026-11');
  assert.equal(assigned.review.length, 0);
  assert.match(assigned.summaries[0].text, /MB290 \(Extra vehicle label\) 081126 0600-1300/);
});
