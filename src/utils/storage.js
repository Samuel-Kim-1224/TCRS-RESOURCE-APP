import { computeEndDate } from '../data/conducts.js';

const KEYS = {
  conducts: 'sch2.conducts',
  cwos: 'sch2.cwos',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (e.g. private mode) - fail silently, app still works in-session.
  }
}

/** Migrate legacy conduct keys from earlier app versions. */
function migrateConduct(entry) {
  let migrated = { ...entry };

  if (migrated.conductKey === 'BTP1' || migrated.conductKey === 'BTP2') {
    migrated.conductKey = 'BTP';
  }
  if (migrated.conductKey === 'BPK2') {
    migrated.conductKey = 'BPK';
  }

  migrated.endDate = computeEndDate(migrated);
  return migrated;
}

export function loadConducts() {
  const raw = load(KEYS.conducts, []);
  return raw.map(migrateConduct);
}

export function saveConducts(conducts) {
  save(KEYS.conducts, conducts);
}

/** CWOs stored as { [companyCode]: { name, number } } */
export function loadCwos() {
  return load(KEYS.cwos, {});
}

export function saveCwos(cwos) {
  save(KEYS.cwos, cwos);
}
