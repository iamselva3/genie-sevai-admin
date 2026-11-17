import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CircleCheck, LogOut, MapPin, Navigation, Phone, PlayCircle, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Wordmark } from '../components/Brand';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState, ErrorBox, Spinner, StatusBadge, TextField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';
import { dayText, inr, landmarkText, minutesText, timeText, todayIst } from '../lib/format';
import type { Job, ProUser } from '../lib/types';

type Scope = 'active' | 'history';

export default function ProPortalPage() {
  const { session, logout } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [scope, setScope] = useState<Scope>('active');
  const [starting, setStarting] = useState<Job | null>(null);
  const [completing, setCompleting] = useState<Job | null>(null);

  const me = useQuery({
    queryKey: ['pro', 'me'],
    queryFn: () => api<{ user: ProUser }>('/pro/me').then((r) => r.user),
    initialData: session?.kind === 'pro' ? session.user : undefined,
    staleTime: 0,
  });
  const jobs = useQuery({
    queryKey: ['pro', 'jobs', scope],
    queryFn: () => api<{ jobs: Job[] }>('/pro/jobs', { query: { scope } }).then((r) => r.jobs),
    refetchInterval: 30_000,
  });

  const update = useMutation({
    mutationFn: (v: { job: Job; status: 'on_the_way' | 'in_progress' | 'completed'; pin?: string }) =>
      api<{ job: Job }>(`/pro/jobs/${v.job.id}/status`, { method: 'POST', body: { status: v.status, pin: v.pin } }).then((r) => r.job),
    onSuccess: (job) => {
      const message = job.status === 'on_the_way' ? 'Customer notified you are on the way' : job.status === 'in_progress' ? 'Job started' : 'Job completed. Great work!';
      toast.success(message);
      qc.invalidateQueries({ queryKey: ['pro'] });
    },
  });

  const user = me.data;
  const today = todayIst();
  const list = jobs.data || [];

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Wordmark tone="light" sub="Pro" />
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
        {user && (
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 pt-2 pb-6">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold">{user.name}</p>
              <p className="truncate text-sm text-white/60">
                {user.city?.name} · {user.skills.map((s) => s.name).join(', ')}
              </p>
            </div>
            <dl className="hidden gap-6 text-right sm:flex">
              <div>
                <dt className="text-[11px] tracking-wide text-white/50 uppercase">Rating</dt>
                <dd className="font-display text-xl font-bold text-yellow">{user.rating ? user.rating.toFixed(1) : 'New'}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-white/50 uppercase">Jobs done</dt>
                <dd className="font-display text-xl font-bold">{user.jobsCompleted}</dd>
              </div>
            </dl>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {user && (
          <dl className="mb-5 grid grid-cols-2 gap-3 sm:hidden">
            <div className="card px-4 py-3">
              <dt className="text-[11px] tracking-wide text-mute uppercase">Rating</dt>
              <dd className="font-display text-xl font-bold">{user.rating ? user.rating.toFixed(1) : 'New'}</dd>
            </div>
            <div className="card px-4 py-3">
              <dt className="text-[11px] tracking-wide text-mute uppercase">Jobs done</dt>
              <dd className="font-display text-xl font-bold">{user.jobsCompleted}</dd>
            </div>
          </dl>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">My jobs</h1>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Show" className="inline-flex rounded-xl border border-line bg-white p-1">
              {(
                [
                  ['active', 'Active'],
                  ['history', 'History'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={scope === v}
                  onClick={() => setScope(v)}
                  className={clsx('h-8 rounded-lg px-3 text-sm font-semibold', scope === v ? 'bg-ink text-white' : 'hover:bg-black/5')}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => jobs.refetch()}
              aria-label="Refresh jobs"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-line bg-white hover:border-ink"
            >
              <RefreshCw className={clsx('size-4', jobs.isFetching && 'animate-[spin_0.8s_linear_infinite]')} aria-hidden="true" />
            </button>
          </div>
        </div>

        {update.error && !starting && (
          <div className="mb-3">
            <ErrorBox message={errorMessage(update.error)} />
          </div>
        )}
        {jobs.error && <ErrorBox message={errorMessage(jobs.error)} onRetry={() => jobs.refetch()} />}

        {jobs.isLoading ? (
          <Spinner label="Loading your jobs" />
        ) : list.length === 0 ? (
          <div className="card">
            <EmptyState
              title={scope === 'active' ? 'No jobs right now' : 'No past jobs yet'}
              body={scope === 'active' ? 'New jobs appear here as soon as the operations team assigns them to you.' : undefined}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((job) => {
              const isToday = job.slot.date === today;
              const busy = update.isPending && update.variables?.job.id === job.id;
              return (
                <li key={job.id} data-testid="job-card" data-code={job.code} data-status={job.status} className="card overflow-hidden">
                  <div className={clsx('flex items-center justify-between gap-3 px-4 py-3', isToday && scope === 'active' ? 'bg-yellow' : 'bg-paper')}>
                    <div>
                      <p className="font-display text-lg leading-tight font-bold">
                        {isToday ? 'Today' : dayText(job.slot.date)} · {timeText(job.slot.time)}
                      </p>
                      <p className="text-xs text-ink/70">
                        {job.code} · {minutesText(job.durationMinutes)}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex flex-col gap-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{job.customer?.name || 'Customer'}</p>
                        <p className="mt-0.5 flex items-start gap-1 text-sm text-mute">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {job.address.line1}
                            {job.address.line2 ? `, ${job.address.line2}` : ''}
                            {job.address.landmark ? ` (${landmarkText(job.address.landmark).toLowerCase()})` : ''}, {job.address.city} {job.address.pincode}
                          </span>
                        </p>
                      </div>
                      {job.customer?.phone && scope === 'active' && (
                        <a
                          href={`tel:${job.customer.phone}`}
                          aria-label={`Call ${job.customer.name || 'customer'}`}
                          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold hover:border-ink"
                        >
                          <Phone className="size-4" aria-hidden="true" />
                          Call
                        </a>
                      )}
                    </div>
                    <ul className="rounded-xl border border-line text-sm">
                      {job.items.map((i) => (
                        <li key={i.serviceId} className="flex justify-between gap-3 border-b border-line px-3 py-2 last:border-0">
                          <span>
                            {i.qty} × {i.name}
                          </span>
                          <span className="text-mute">{inr(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    {job.notes && (
                      <p className="rounded-xl bg-paper px-3 py-2 text-sm">
                        <span className="font-semibold">Note: </span>
                        {job.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm">
                        <span className="font-display text-xl font-bold">{inr(job.pricing.total)}</span>{' '}
                        <span className="text-mute">{job.paymentStatus === 'paid' ? '· collected' : '· Collect after service'}</span>
                      </p>
                      {scope === 'active' && (
                        <div className="flex flex-wrap gap-2">
                          {job.status === 'assigned' && (
                            <Button
                              variant="outline"
                              busy={busy && update.variables?.status === 'on_the_way'}
                              icon={<Navigation className="size-4" aria-hidden="true" />}
                              onClick={() => update.mutate({ job, status: 'on_the_way' })}
                            >
                              On the way
                            </Button>
                          )}
                          {(job.status === 'assigned' || job.status === 'on_the_way') && (
                            <Button
                              variant="primary"
                              icon={<PlayCircle className="size-4" aria-hidden="true" />}
                              onClick={() => {
                                update.reset();
                                setStarting(job);
                              }}
                            >
                              Start job
                            </Button>
                          )}
                          {job.status === 'in_progress' && (
                            <Button variant="accent" icon={<CircleCheck className="size-4" aria-hidden="true" />} onClick={() => setCompleting(job)}>
                              Mark completed
                            </Button>
                          )}
                        </div>
                      )}
                      {scope === 'history' && job.review && (
                        <p className="text-sm font-semibold">
                          ★ {job.review.rating}
                          {job.review.comment ? <span className="font-normal text-mute"> · “{job.review.comment}”</span> : null}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <StartJobModal
        key={starting?.id || 'closed'}
        job={starting}
        onClose={() => setStarting(null)}
        onStart={(job, pin) =>
          update.mutateAsync({ job, status: 'in_progress', pin }).then(() => {
            setStarting(null);
          })
        }
      />

      <ConfirmDialog
        open={!!completing}
        title="Mark this job as completed?"
        message={
          completing ? (
            <>
              Collect <strong>{inr(completing.pricing.total)}</strong> from {completing.customer?.name || 'the customer'} (cash or UPI) before you close the job.
            </>
          ) : null
        }
        confirmLabel="Confirm"
        busy={update.isPending}
        error={completing && update.error ? errorMessage(update.error) : null}
        onConfirm={() => completing && update.mutate({ job: completing, status: 'completed' }, { onSuccess: () => setCompleting(null) })}
        onClose={() => {
          update.reset();
          setCompleting(null);
        }}
      />
    </div>
  );
}

function StartJobModal({ job, onClose, onStart }: { job: Job | null; onClose: () => void; onStart: (job: Job, pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter the 4-digit PIN');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onStart(job, pin);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!job}
      onClose={busy ? () => undefined : onClose}
      title="Start job"
      description={job ? `Ask ${job.customer?.name || 'the customer'} for the 4-digit service PIN shown in their booking.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Back
          </Button>
          <Button type="submit" form="start-job-form" busy={busy}>
            Start job
          </Button>
        </>
      }
    >
      <form id="start-job-form" onSubmit={submit} noValidate>
        <TextField
          label="Service PIN"
          id="service-pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(null);
          }}
          error={error}
          className="[&_input]:h-14 [&_input]:text-center [&_input]:font-display [&_input]:text-2xl [&_input]:tracking-[0.5em]"
        />
      </form>
    </Modal>
  );
}
