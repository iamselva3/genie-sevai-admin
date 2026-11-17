import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, CalendarClock, Navigation, Phone, PlayCircle, CircleCheck, UserPlus, UserMinus, Ban } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorBox,
  KeyValue,
  Pill,
  Spinner,
  Stars,
  StatusBadge,
  TextAreaField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateTimeText, dayText, inr, landmarkText, minutesText, person, slotText, timeText, timelineLabel } from '../lib/format';
import { useCategories, useCities } from '../lib/lookups';
import type { Booking, ProOption, SlotDay } from '../lib/types';

type ActionStatus = 'on_the_way' | 'in_progress' | 'completed';

const STATUS_ACTIONS: Record<ActionStatus, { title: string; label: string; body: string }> = {
  on_the_way: {
    title: 'Mark as on the way',
    label: 'On the way',
    body: 'Tell the customer their professional has left for the job.',
  },
  in_progress: {
    title: 'Start this job',
    label: 'Start job',
    body: 'Professionals normally start a job with the customer’s service PIN. Use this only if the customer confirmed by phone.',
  },
  completed: {
    title: 'Mark as completed',
    label: 'Mark completed',
    body: 'This marks the payment as collected after service and closes the job.',
  },
};

function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {actions}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<ActionStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);

  const key = ['admin', 'booking', id];
  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api<{ booking: Booking }>(`/admin/bookings/${id}`).then((r) => r.booking),
  });

  const applied = (next: Booking, message: string) => {
    qc.setQueryData(key, next);
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    qc.invalidateQueries({ queryKey: ['admin', 'booking-pros', id] });
    toast.success(message);
  };

  if (isLoading) return <Spinner label="Loading booking" />;
  if (error || !booking) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorBox message={errorMessage(error, 'Booking not found')} onRetry={() => refetch()} />
      </div>
    );
  }

  const customer = person(booking.customer);
  const pro = person(booking.professional);
  const s = booking.status;
  const open = s !== 'completed' && s !== 'cancelled';

  return (
    <div>
      <BackLink />
      <div className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold sm:text-[28px]">{booking.code}</h1>
            <StatusBadge status={s} testId="booking-status" />
            {booking.paymentStatus === 'paid' ? <Pill tone="ok">Paid</Pill> : <Pill>Pay after service</Pill>}
          </div>
          <p className="mt-1 text-sm text-mute">
            {booking.categoryName} · {booking.cityName} · placed {dateTimeText(booking.createdAt)}
          </p>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2">
            {(s === 'pending' || s === 'assigned') && (
              <Button variant={s === 'pending' ? 'accent' : 'outline'} icon={<UserPlus className="size-4" aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
                {s === 'pending' ? 'Assign professional' : 'Reassign'}
              </Button>
            )}
            {s === 'assigned' && (
              <Button variant="primary" icon={<Navigation className="size-4" aria-hidden="true" />} onClick={() => setStatusAction('on_the_way')}>
                On the way
              </Button>
            )}
            {(s === 'assigned' || s === 'on_the_way') && (
              <Button variant={s === 'on_the_way' ? 'primary' : 'outline'} icon={<PlayCircle className="size-4" aria-hidden="true" />} onClick={() => setStatusAction('in_progress')}>
                Start job
              </Button>
            )}
            {s === 'in_progress' && (
              <Button variant="primary" icon={<CircleCheck className="size-4" aria-hidden="true" />} onClick={() => setStatusAction('completed')}>
                Mark completed
              </Button>
            )}
            {(s === 'pending' || s === 'assigned') && (
              <Button variant="outline" icon={<CalendarClock className="size-4" aria-hidden="true" />} onClick={() => setRescheduleOpen(true)}>
                Reschedule
              </Button>
            )}
            <Button variant="ghost" className="text-bad" icon={<Ban className="size-4" aria-hidden="true" />} onClick={() => setCancelOpen(true)}>
              Cancel booking
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Section title="Service">
            <dl className="mb-4 grid gap-4 sm:grid-cols-3">
              <KeyValue label="Slot">{slotText(booking.slot)}</KeyValue>
              <KeyValue label="Duration">{minutesText(booking.durationMinutes)}</KeyValue>
              <KeyValue label="Payment">{booking.paymentStatus === 'paid' ? 'Collected' : 'Collect after service'}</KeyValue>
            </dl>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {booking.items.map((item) => (
                <li key={item.service + item.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-mute">
                      {item.qty} × {inr(item.price)} · {minutesText(item.durationMinutes)}
                    </p>
                  </div>
                  <span className="font-semibold">{inr(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1.5 text-sm">
              <Row label="Item total" value={inr(booking.pricing.subtotal)} />
              {booking.pricing.discount > 0 && (
                <Row label={`Coupon ${booking.pricing.couponCode}`} value={`− ${inr(booking.pricing.discount)}`} />
              )}
              <Row label="Visit fee" value={booking.pricing.visitFee ? inr(booking.pricing.visitFee) : 'Free'} />
              <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{inr(booking.pricing.total)}</dd>
              </div>
            </dl>
            {booking.notes && (
              <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">
                <span className="font-semibold">Customer note: </span>
                {booking.notes}
              </p>
            )}
          </Section>

          <Section title="Timeline">
            <ol className="relative flex flex-col gap-4 pl-5">
              <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-line" aria-hidden="true" />
              {[...booking.timeline].reverse().map((t, i) => (
                <li key={`${t.at}-${i}`} className="relative">
                  <span
                    className={clsx(
                      'absolute top-1.5 -left-5 size-[11px] rounded-full border-2',
                      i === 0 ? 'border-ink bg-yellow' : 'border-line bg-white',
                    )}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold">{timelineLabel(t.status)}</p>
                  <p className="text-xs text-mute">
                    {dateTimeText(t.at)} · by {t.actor}
                    {t.note ? ` · ${t.note}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section
            title="Professional"
            actions={
              s === 'assigned' ? (
                <Button size="sm" variant="ghost" icon={<UserMinus className="size-4" aria-hidden="true" />} onClick={() => setUnassignOpen(true)}>
                  Unassign
                </Button>
              ) : null
            }
          >
            {pro ? (
              <div className="flex items-center gap-3">
                <Avatar name={pro.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" data-testid="assigned-pro">
                    {pro.name}
                  </p>
                  <p className="text-xs text-mute">
                    <Stars value={pro.rating || 0} /> · {pro.jobsCompleted ?? 0} jobs · {pro.experienceYears ?? 0} yrs
                  </p>
                  <a href={`tel:${pro.phone}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {pro.phone}
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-mute">{open ? 'No professional assigned yet.' : 'No professional was assigned.'}</p>
                {s === 'pending' && (
                  <Button size="sm" variant="accent" onClick={() => setAssignOpen(true)}>
                    Assign professional
                  </Button>
                )}
              </div>
            )}
          </Section>

          <Section title="Customer">
            {customer ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={customer.name || 'Customer'} />
                  <div className="min-w-0">
                    <Link to={`/customers/${customer.id}`} className="font-semibold hover:underline">
                      {customer.name || 'Customer'}
                    </Link>
                    <p className="text-xs text-mute">{customer.email || 'No email'}</p>
                  </div>
                </div>
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                  <Phone className="size-3.5" aria-hidden="true" />
                  {customer.phone}
                </a>
              </div>
            ) : (
              <p className="text-sm text-mute">Customer record not found.</p>
            )}
            <div className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide text-mute uppercase">{booking.address.label} address</p>
              <p className="mt-1">
                {booking.address.line1}
                {booking.address.line2 ? `, ${booking.address.line2}` : ''}
              </p>
              {booking.address.landmark && <p className="text-mute">{landmarkText(booking.address.landmark)}</p>}
              <p>
                {booking.address.city} {booking.address.pincode}
              </p>
            </div>
          </Section>

          {booking.cancellation && (
            <Section title="Cancellation">
              <p className="text-sm">{booking.cancellation.reason}</p>
              <p className="mt-1 text-xs text-mute">
                By {booking.cancellation.by} · {dateTimeText(booking.cancellation.at)}
              </p>
            </Section>
          )}

          {booking.review && (
            <Section title="Review">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold">{booking.review.rating}</span>
                <span aria-hidden="true">{'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}</span>
                {booking.review.hidden && <Pill tone="warn">Hidden</Pill>}
              </div>
              {booking.review.comment && <p className="mt-2 text-sm">“{booking.review.comment}”</p>}
            </Section>
          )}
        </div>
      </div>

      <AssignModal open={assignOpen} booking={booking} onClose={() => setAssignOpen(false)} onDone={(b, name) => applied(b, `${name} assigned to ${b.code}`)} />

      <StatusModal
        action={statusAction}
        booking={booking}
        onClose={() => setStatusAction(null)}
        onDone={(b) => applied(b, `Booking ${b.code} updated`)}
      />

      <CancelModal open={cancelOpen} booking={booking} onClose={() => setCancelOpen(false)} onDone={(b) => applied(b, `Booking ${b.code} cancelled`)} />

      <RescheduleModal
        open={rescheduleOpen}
        booking={booking}
        onClose={() => setRescheduleOpen(false)}
        onDone={(b) => applied(b, `Moved to ${slotText(b.slot)}`)}
      />

      <UnassignModal open={unassignOpen} booking={booking} onClose={() => setUnassignOpen(false)} onDone={(b) => applied(b, 'Professional removed')} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mute">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Bookings
    </Link>
  );
}

interface ModalBaseProps {
  booking: Booking;
  onClose: () => void;
  onDone: (b: Booking) => void;
}

function AssignModal({ open, booking, onClose, onDone }: Omit<ModalBaseProps, 'onDone'> & { open: boolean; onDone: (b: Booking, name: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const options = useQuery({
    queryKey: ['admin', 'booking-pros', booking.id],
    queryFn: () => api<{ professionals: ProOption[] }>(`/admin/bookings/${booking.id}/professionals`).then((r) => r.professionals),
    enabled: open,
    staleTime: 0,
  });
  const assign = useMutation({
    mutationFn: (p: ProOption) =>
      api<{ booking: Booking }>(`/admin/bookings/${booking.id}/assign`, { method: 'POST', body: { professionalId: p.id } }).then((r) => ({
        booking: r.booking,
        name: p.name,
      })),
    onSuccess: ({ booking: b, name }) => {
      onDone(b, name);
      close();
    },
    onError: (err) => {
      setError(errorMessage(err));
      options.refetch();
    },
  });
  const close = () => {
    setError(null);
    assign.reset();
    onClose();
  };
  const list = options.data || [];
  const free = list.filter((p) => p.available).length;

  return (
    <Modal
      open={open}
      onClose={close}
      title={booking.status === 'assigned' ? 'Reassign professional' : 'Assign a professional'}
      description={`${booking.categoryName} · ${booking.cityName} · ${slotText(booking.slot)}`}
      size="lg"
    >
      {error && (
        <div className="mb-3">
          <ErrorBox message={error} />
        </div>
      )}
      {options.isLoading ? (
        <Spinner label="Finding professionals" />
      ) : options.error ? (
        <ErrorBox message={errorMessage(options.error)} onRetry={() => options.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="No professionals" body={`Nobody active in ${booking.cityName} is trained for ${booking.categoryName}. Add one under Professionals.`} />
      ) : (
        <>
          <p className="mb-3 text-sm text-mute">
            {free} of {list.length} free at this time, sorted by rating.
          </p>
          <ul className="flex flex-col gap-2">
            {list.map((p) => {
              const busy = assign.isPending && assign.variables?.id === p.id;
              return (
                <li
                  key={p.id}
                  data-testid="pro-option"
                  data-name={p.name}
                  data-available={p.available}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border px-3 py-3',
                    p.current ? 'border-ink bg-yellow-soft' : 'border-line',
                    !p.available && !p.current && 'bg-paper',
                  )}
                >
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.name} {p.current && <span className="font-normal text-mute">(current)</span>}
                    </p>
                    <p className="text-xs text-mute">
                      <Stars value={p.rating} /> · {p.jobsCompleted} jobs · {p.experienceYears} yrs · {p.phone}
                    </p>
                    {!p.available && <p className="mt-0.5 text-xs font-medium text-warn">{p.reason}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={p.available && !p.current ? 'primary' : 'outline'}
                    disabled={!p.available || p.current || assign.isPending}
                    busy={busy}
                    onClick={() => {
                      setError(null);
                      assign.mutate(p);
                    }}
                  >
                    Assign
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

function StatusModal({ action, booking, onClose, onDone }: ModalBaseProps & { action: ActionStatus | null }) {
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: (status: ActionStatus) =>
      api<{ booking: Booking }>(`/admin/bookings/${booking.id}/status`, {
        method: 'POST',
        body: { status, note: note.trim() || undefined },
      }).then((r) => r.booking),
    onSuccess: (b) => {
      onDone(b);
      close();
    },
  });
  const close = () => {
    setNote('');
    mutation.reset();
    onClose();
  };
  const meta = action ? STATUS_ACTIONS[action] : null;
  return (
    <Modal
      open={!!action}
      onClose={close}
      title={meta?.title || ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Back
          </Button>
          <Button onClick={() => action && mutation.mutate(action)} busy={mutation.isPending}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm">{meta?.body}</p>
        <TextAreaField label="Note (optional)" id="status-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Visible in the booking timeline" />
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </div>
    </Modal>
  );
}

function CancelModal({ open, booking, onClose, onDone }: ModalBaseProps & { open: boolean }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api<{ booking: Booking }>(`/admin/bookings/${booking.id}/cancel`, { method: 'POST', body: { reason: reason.trim() } }).then((r) => r.booking),
    onSuccess: (b) => {
      onDone(b);
      close();
    },
  });
  const close = () => {
    setReason('');
    setTouched(false);
    mutation.reset();
    onClose();
  };
  const tooShort = reason.trim().length < 3;
  return (
    <Modal
      open={open}
      onClose={close}
      title={`Cancel ${booking.code}?`}
      description="The customer sees this reason in their booking."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Keep booking
          </Button>
          <Button
            variant="danger"
            busy={mutation.isPending}
            onClick={() => {
              setTouched(true);
              if (!tooShort) mutation.mutate();
            }}
          >
            Confirm cancellation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextAreaField
          label="Reason"
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          error={touched && tooShort ? 'Add a reason (at least 3 characters)' : null}
          placeholder="e.g. Customer asked by phone"
        />
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </div>
    </Modal>
  );
}

function UnassignModal({ open, booking, onClose, onDone }: ModalBaseProps & { open: boolean }) {
  const mutation = useMutation({
    mutationFn: () => api<{ booking: Booking }>(`/admin/bookings/${booking.id}/unassign`, { method: 'POST' }).then((r) => r.booking),
    onSuccess: (b) => {
      onDone(b);
      mutation.reset();
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      title="Remove the professional?"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Back
          </Button>
          <Button variant="danger" busy={mutation.isPending} onClick={() => mutation.mutate()}>
            Unassign
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <p>The booking goes back to “Needs a pro” so you can assign someone else.</p>
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </div>
    </Modal>
  );
}

function RescheduleModal({ open, booking, onClose, onDone }: ModalBaseProps & { open: boolean }) {
  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const citySlug = cities?.find((c) => c.id === booking.city)?.slug;
  const categorySlug = categories?.find((c) => c.id === booking.category)?.slug;
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const slots = useQuery({
    queryKey: ['slots', citySlug, categorySlug, booking.id],
    queryFn: () =>
      api<{ capacity: number; days: SlotDay[] }>('/slots', { query: { city: citySlug, category: categorySlug, exclude: booking.id } }),
    enabled: open && !!citySlug && !!categorySlug,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: () => api<{ booking: Booking }>(`/admin/bookings/${booking.id}/reschedule`, { method: 'POST', body: { date, time } }).then((r) => r.booking),
    onSuccess: (b) => {
      onDone(b);
      close();
    },
  });

  const close = () => {
    setDate(null);
    setTime(null);
    mutation.reset();
    onClose();
  };

  const days = slots.data?.days || [];
  const activeDate = date || days.find((d) => d.slots.some((s) => s.available))?.date || days[0]?.date || null;
  const activeDay = days.find((d) => d.date === activeDate);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reschedule booking"
      description={`Currently ${slotText(booking.slot)}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Back
          </Button>
          <Button busy={mutation.isPending} disabled={!time || !activeDate} onClick={() => mutation.mutate()}>
            Reschedule
          </Button>
        </>
      }
    >
      {!citySlug || !categorySlug || slots.isLoading ? (
        <Spinner label="Loading slots" />
      ) : slots.error ? (
        <ErrorBox message={errorMessage(slots.error)} onRetry={() => slots.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div role="group" aria-label="Date" className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const any = d.slots.some((s) => s.available);
              const selected = d.date === activeDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  aria-pressed={selected}
                  aria-label={dayText(d.date)}
                  disabled={!any}
                  onClick={() => {
                    setDate(d.date);
                    setTime(null);
                  }}
                  className={clsx(
                    'flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-sm disabled:opacity-40',
                    selected ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase opacity-70">{d.weekday}</span>
                  <span className="font-display text-lg font-bold">{d.day}</span>
                  <span className="text-[11px] opacity-70">{d.month}</span>
                </button>
              );
            })}
          </div>
          {activeDay && (
            <div role="group" aria-label="Time" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {activeDay.slots.map((slot) => {
                const current = activeDay.date === booking.slot.date && slot.time === booking.slot.time;
                const selected = time === slot.time && date === activeDay.date;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    aria-pressed={selected}
                    disabled={!slot.available || current}
                    onClick={() => {
                      setDate(activeDay.date);
                      setTime(slot.time);
                    }}
                    className={clsx(
                      'h-10 rounded-xl border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35',
                      selected ? 'border-yellow-deep bg-yellow text-ink' : 'border-line bg-white hover:border-ink',
                    )}
                  >
                    {timeText(slot.time)}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-mute">
            Greyed-out times are full or too soon. If the current professional is busy at the new time, the booking returns to “Needs a pro”.
          </p>
          {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
        </div>
      )}
    </Modal>
  );
}
