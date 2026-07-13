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

export function loadConducts() {
  return load(KEYS.conducts, []);
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
