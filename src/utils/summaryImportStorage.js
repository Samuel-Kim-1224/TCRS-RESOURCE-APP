const PREFIX = 'sch2.indent-summary-import.v1';

function keyForSchool(schoolId) {
  return `${PREFIX}:${schoolId || 'unknown'}`;
}

export function loadImportedSummary(schoolId) {
  let raw;
  try {
    raw = localStorage.getItem(keyForSchool(schoolId));
  } catch (error) {
    throw new Error(`Could not access this browser's saved summary: ${error.message || 'storage is unavailable'}`);
  }
  if (!raw) return null;

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('The saved uploaded summary is damaged and could not be read.');
  }

  if (value?.version !== 1 || !value.sources || typeof value.sources !== 'object' || Array.isArray(value.sources)) {
    throw new Error('The saved uploaded summary has an unsupported or incomplete format.');
  }

  for (const [type, source] of Object.entries(value.sources)) {
    if (!source || !Array.isArray(source.records)) {
      throw new Error(`The saved ${type} import is incomplete. Clear the uploaded summary to recover.`);
    }
  }
  if (value.assignments !== undefined && (!value.assignments || typeof value.assignments !== 'object' || Array.isArray(value.assignments))) {
    throw new Error('The saved review assignments could not be read. Clear the uploaded summary to recover.');
  }

  return value;
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
