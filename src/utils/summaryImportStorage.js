const PREFIX = 'sch2.indent-summary-import.v1';

function keyForSchool(schoolId) {
  return `${PREFIX}:${schoolId || 'unknown'}`;
}

export function loadImportedSummary(schoolId) {
  try {
    const raw = localStorage.getItem(keyForSchool(schoolId));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !value.sources || typeof value.sources !== 'object') return null;
    return value;
  } catch {
    return null;
  }
}

export function saveImportedSummary(schoolId, value) {
  try {
    localStorage.setItem(keyForSchool(schoolId), JSON.stringify({ ...value, version: 1 }));
    return true;
  } catch {
    return false;
  }
}

export function clearImportedSummary(schoolId) {
  try {
    localStorage.removeItem(keyForSchool(schoolId));
    return true;
  } catch {
    return false;
  }
}
