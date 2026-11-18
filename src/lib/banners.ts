import { api } from './api';
import type { Banner, BannerAction, BannerArt, BannerInput, BannerTextTone } from './types';

/* ---------------- API ---------------- */

export const BANNERS_KEY = ['admin', 'banners'];

export const listBanners = () => api<{ banners: Banner[] }>('/admin/banners').then((r) => r.banners);

export const createBanner = (body: Partial<BannerInput> & { title: string }) =>
  api<{ banner: Banner }>('/admin/banners', { method: 'POST', body }).then((r) => r.banner);

export const updateBanner = (id: string, body: Partial<BannerInput>) =>
  api<{ banner: Banner }>(`/admin/banners/${id}`, { method: 'PATCH', body }).then((r) => r.banner);

export const deleteBanner = (id: string) => api<{ ok: true }>(`/admin/banners/${id}`, { method: 'DELETE' });

/** `ids` is the full list in its new order. */
export const reorderBanners = (ids: string[]) => api<{ ok: true }>('/admin/banners/reorder', { method: 'POST', body: { ids } });

/* ---------------- Options ---------------- */

export const ART_LABEL: Record<Exclude<BannerArt, ''>, string> = { bathroom: 'Bathroom', ac: 'AC', gift: 'Gift' };

export const ART_OPTIONS: { value: BannerArt; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'ac', label: 'AC' },
  { value: 'gift', label: 'Gift' },
];

export const ACTION_LABEL: Record<BannerAction, string> = {
  service: 'Service',
  category: 'Category',
  coupon: 'Coupon',
  link: 'Link',
  none: 'No action',
};

export const ACTION_OPTIONS: { value: BannerAction; label: string }[] = [
  { value: 'service', label: 'Open a service' },
  { value: 'category', label: 'Open a category' },
  { value: 'coupon', label: 'Apply a coupon' },
  { value: 'link', label: 'Open a link' },
  { value: 'none', label: 'Nothing (not clickable)' },
];

export const SWATCHES: { hex: string; name: string }[] = [
  { hex: '#D7F0EA', name: 'Mint' },
  { hex: '#CDE8FF', name: 'Sky' },
  { hex: '#FFD43B', name: 'Sunflower' },
  { hex: '#5B3FD9', name: 'Violet' },
  { hex: '#FFE1D6', name: 'Peach' },
  { hex: '#111111', name: 'Black' },
  { hex: '#F2F2F4', name: 'Light grey' },
  { hex: '#0F766E', name: 'Teal' },
];

export const DEFAULT_BACKGROUND = '#D7F0EA';

/* ---------------- Helpers ---------------- */

export const HEX_RE = /^#[0-9A-F]{6}$/i;

/** "d7f0ea" / "#d7f0ea" → "#D7F0EA"; null if it is not a full 6-digit hex colour. */
export function normaliseHex(value: string) {
  const v = value.trim().replace(/^#?/, '#').toUpperCase();
  return HEX_RE.test(v) ? v : null;
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string) {
  const n = normaliseHex(hex);
  if (!n) return 1;
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Picks whichever of near-black (#111111) or white text has the better contrast on this background. */
export function suggestTone(hex: string): BannerTextTone {
  const L = luminance(hex);
  const dark = 0.0056; // luminance of #111111
  const onDark = (L + 0.05) / (dark + 0.05);
  const onLight = 1.05 / (L + 0.05);
  return onDark >= onLight ? 'dark' : 'light';
}

export type BannerStatusKey = 'active' | 'off' | 'scheduled' | 'expired';

export function bannerStatus(b: Pick<Banner, 'isActive' | 'startsAt' | 'endsAt'>, now = Date.now()): { key: BannerStatusKey; label: string } {
  if (!b.isActive) return { key: 'off', label: 'Off' };
  const end = b.endsAt ? Date.parse(b.endsAt) : NaN;
  if (!Number.isNaN(end) && now > end) return { key: 'expired', label: 'Expired' };
  const start = b.startsAt ? Date.parse(b.startsAt) : NaN;
  if (!Number.isNaN(start) && now < start) return { key: 'scheduled', label: 'Scheduled' };
  return { key: 'active', label: 'Active' };
}

/** "Service · bathroom-deep-cleaning", "Coupon · WELCOME100", "No action". */
export function actionSummary(b: Pick<Banner, 'action' | 'target'>) {
  if (b.action === 'none' || !b.target) return ACTION_LABEL.none;
  return `${ACTION_LABEL[b.action] ?? b.action} · ${b.target}`;
}

/** ISO timestamp → YYYY-MM-DD in IST, for <input type="date">. */
export function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t + 330 * 60_000).toISOString().slice(0, 10);
}

/** Valid banner link: a site path ("/explore") or a full https:// URL. */
export function isValidLink(value: string) {
  const v = value.trim();
  return (/^\/(?!\/)\S*$/.test(v) || /^https:\/\/[^\s/?#]+([/?#]\S*)?$/i.test(v)) && v.length <= 300;
}
