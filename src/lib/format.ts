import type { BookingStatus, PersonRef, Ref } from './types';

export function inr(value: number | null | undefined) {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue, 17 Nov" for a YYYY-MM-DD local date (no timezone shifting). */
export function dayText(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

/** "11:00" → "11:00 AM" */
export function timeText(time: string) {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

export function slotText(slot: { date: string; time: string }) {
  return `${dayText(slot.date)} · ${timeText(slot.time)}`;
}

export function dateTimeText(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function dateText(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
}

export function minutesText(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Needs a pro',
  assigned: 'Assigned',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUSES: BookingStatus[] = ['pending', 'assigned', 'on_the_way', 'in_progress', 'completed', 'cancelled'];

export function timelineLabel(status: string) {
  if (status in STATUS_LABEL) return STATUS_LABEL[status as BookingStatus];
  if (status === 'rescheduled') return 'Rescheduled';
  if (status === 'unassigned') return 'Professional removed';
  return status.replace(/_/g, ' ');
}

export function person(value: PersonRef | string | null | undefined): PersonRef | null {
  if (!value || typeof value === 'string') return null;
  return value;
}

export function refName(value: Ref | string | null | undefined) {
  if (!value) return '—';
  return typeof value === 'string' ? value : value.name;
}

export function refId(value: Ref | string | null | undefined) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id;
}

/** "Adyar Depot" → "Near Adyar Depot", without doubling an existing "near". */
export function landmarkText(landmark: string) {
  const l = landmark.trim();
  if (!l) return '';
  return /^near\b/i.test(l) ? l : `Near ${l}`;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIst() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}
