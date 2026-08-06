/** School account login → Supabase email + school id. */

export const SCHOOL_ACCOUNTS = [
  { username: 'HQ', email: 'hq@tcrs.local', school: 'HQ', label: 'HQ' },
  { username: 'SCH1', email: 'sch1@tcrs.local', school: 'I', label: 'Sch I' },
  { username: 'SCH2', email: 'sch2@tcrs.local', school: 'II', label: 'Sch II' },
  { username: 'SCH3', email: 'sch3@tcrs.local', school: 'III', label: 'Sch III' },
  { username: 'SCH4', email: 'sch4@tcrs.local', school: 'IV', label: 'Sch IV' },
];

/** School login buttons (SCH1–4). HQ is rendered separately above the grid. */
export const SCHOOL_LOGIN_ACCOUNTS = SCHOOL_ACCOUNTS.filter((a) => a.username !== 'HQ');

export const HQ_ACCOUNT = SCHOOL_ACCOUNTS.find((a) => a.username === 'HQ');

export function accountByUsername(username) {
  const key = (username || '').trim().toUpperCase();
  return SCHOOL_ACCOUNTS.find((a) => a.username === key) ?? null;
}

export function accountByEmail(email) {
  const key = (email || '').trim().toLowerCase();
  return SCHOOL_ACCOUNTS.find((a) => a.email === key) ?? null;
}

export function schoolFromSession(session) {
  const email = session?.user?.email;
  return accountByEmail(email)?.school ?? null;
}

export function usernameFromSession(session) {
  const email = session?.user?.email;
  return accountByEmail(email)?.username ?? email ?? '';
}
