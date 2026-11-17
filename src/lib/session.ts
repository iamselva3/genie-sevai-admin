import type { ProUser, StaffUser } from './types';

export type Session =
  | { kind: 'staff'; token: string; user: StaffUser }
  | { kind: 'pro'; token: string; user: ProUser };

const KEY = 'sevai.admin.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.token || (parsed.kind !== 'staff' && parsed.kind !== 'pro')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}
