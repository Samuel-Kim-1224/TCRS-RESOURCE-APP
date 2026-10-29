import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBusTrips, generateBusTripsForConducts } from './busEngine.js';
import { buildCompanySummaries } from './summaryText.js';

const DAY = '2026-11-07';

test('ISAD creates two 4-bus waves each way using the 100m Range matrix route', () => {
  const trips = generateBusTrips({ conductKey: 'ISAD', date: DAY, companyCode: 'J' });
  assert.deepEqual(trips.map((trip) => [trip.time, trip.tripName, trip.route, trip.buses]), [
    ['07:00', 'ISAD Wave1', 'MTL - 100M RANGE', '4'],
    ['07:40', 'ISAD Wave2', 'MTL - 100M RANGE', '4'],
    ['11:00', 'ISAD Wave1 RTU', '100M RANGE - MTL', '4'],
    ['11:40', 'ISAD Wave2 RTU', '100M RANGE - MTL', '4'],
  ]);
});

test('ISAD moves later to avoid other conduct trips and never starts before 07:00', () => {
  const entries = [
    { id: 'isad', conductKey: 'ISAD', date: DAY, companyCode: 'J' },
    { id: 'bic', conductKey: 'BIC', date: DAY, companyCode: 'K', period: 'PM' },
  ];
  const trips = generateBusTripsForConducts(entries);
  const isad = trips.filter((trip) => trip.entryOrder === 0);
  const fixed = trips.filter((trip) => trip.entryOrder === 1);

  assert.deepEqual(isad.map((trip) => trip.time), ['08:10', '08:50', '12:10', '12:50']);
  assert.ok(isad.every((trip) => trip.time >= '07:00'));
  for (const isadTrip of isad) {
    for (const fixedTrip of fixed) {
      const difference = Math.abs(
        Number(isadTrip.time.slice(0, 2)) * 60 + Number(isadTrip.time.slice(3)) -
        Number(fixedTrip.time.slice(0, 2)) * 60 - Number(fixedTrip.time.slice(3)),
      );
      assert.ok(difference >= Math.max(isadTrip.gap, fixedTrip.gap));
    }
  }
});

test('separate ISAD conducts are staggered against each other', () => {
  const trips = generateBusTripsForConducts([
    { id: 'isad-j', conductKey: 'ISAD', date: DAY, companyCode: 'J' },
    { id: 'isad-k', conductKey: 'ISAD', date: DAY, companyCode: 'K' },
  ]);
  const leadTrips = trips.filter((trip) => trip.entryOrder === 0);
  const nextTrips = trips.filter((trip) => trip.entryOrder === 1);

  assert.equal(leadTrips[0].time, '07:00');
  assert.equal(nextTrips[0].time, '08:20');
  for (const first of leadTrips) {
    for (const second of nextTrips) {
      const difference = Math.abs(
        Number(first.time.slice(0, 2)) * 60 + Number(first.time.slice(3)) -
        Number(second.time.slice(0, 2)) * 60 - Number(second.time.slice(3)),
      );
      assert.ok(difference >= Math.max(first.gap, second.gap));
    }
  }
});

test('HG retains its hard-coded base schedule', () => {
  const trips = generateBusTripsForConducts([
    { id: 'hg', conductKey: 'HG', date: DAY, companyCode: 'J' },
  ]);
  assert.deepEqual(trips.map((trip) => trip.time), ['07:00', '12:20', '13:00', '17:00']);
});

test('Indent Summary uses the same deconflicted ISAD times as the Bus tab', () => {
  const summaries = buildCompanySummaries([
    { id: 'isad', conductKey: 'ISAD', date: DAY, endDate: DAY, companyCode: 'J' },
    { id: 'bic', conductKey: 'BIC', date: DAY, endDate: DAY, companyCode: 'K', period: 'PM' },
  ], '2026-11', {});
  const isadSummary = summaries.find((summary) => summary.companyCode === 'J')?.text || '';

  assert.match(isadSummary, /08:10 MTL→100M RANGE/);
  assert.match(isadSummary, /12:10 100M RANGE→MTL/);
});
