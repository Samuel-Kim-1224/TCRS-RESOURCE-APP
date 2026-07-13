const KEY = 'sch2.theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
