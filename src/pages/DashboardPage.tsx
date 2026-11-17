import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui';
import { useStaff } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';
import { dayText, inr, person, slotText } from '../lib/format';
import type { DashboardData } from '../lib/types';

function Kpi({ label, value, to, tone = 'white' }: { label: string; value: string | number; to?: string; tone?: 'white' | 'yellow' | 'ink' }) {
  const body = (
    <div
      className={clsx(
        'flex h-full flex-col justify-between gap-6 rounded-2xl border p-4 transition-colors',
        tone === 'yellow' && 'border-yellow-deep bg-yellow text-ink',
        tone === 'ink' && 'border-ink bg-ink text-white',
        tone === 'white' && 'border-line bg-white text-ink',
        to && 'hover:border-ink',
      )}
    >
      <p className={clsx('text-xs font-semibold tracking-wide uppercase', tone === 'ink' ? 'text-white/60' : 'text-ink/60')}>{label}</p>
      <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function DashboardPage() {
  const staff = useStaff();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardData>('/admin/dashboard'),
    refetchInterval: 30_000,
  });

  if (isLoading) return <Spinner label="Loading dashboard" />;
  if (error || !data) return <ErrorBox message={errorMessage(error, 'Could not load the dashboard')} onRetry={() => refetch()} />;

  const maxWeek = Math.max(1, ...data.week.map((w) => w.bookings));
  const firstName = staff?.name.split(' ')[0] || 'there';

  return (
    <div>
      <PageHeader title={`Hello, ${firstName}`} subtitle={`Here is how ${dayText(data.today)} is going.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Today's bookings" value={data.todayBookings} to={`/bookings?date=${data.today}`} tone="ink" />
        <Kpi label="Needs a professional" value={data.pendingAssignment} to="/bookings?status=pending" tone="yellow" />
        <Kpi label="Revenue (completed)" value={inr(data.revenue)} />
        <Kpi label="Active professionals" value={data.activeProfessionals} to="/professionals" />
        <Kpi label="Customers" value={data.customers} to="/customers" />
        <Kpi label="Open enquiries" value={data.openEnquiries} to="/enquiries" />
        <Kpi label="New pro applications" value={data.newApplications} to="/applications" />
        <Kpi
          label="Live services"
          value={`${data.services.active || 0} / ${(data.services.active || 0) + (data.services.unavailable || 0) + (data.services.hidden || 0)}`}
          to="/services"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="week-title">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="week-title" className="font-display text-lg font-bold">
              Last 7 days
            </h2>
            <p className="text-xs text-mute">Bookings by service date</p>
          </div>
          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3" role="list" aria-label="Bookings per day">
            {data.week.map((w) => {
              const isToday = w.date === data.today;
              return (
                <div key={w.date} role="listitem" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-semibold">{w.bookings}</span>
                  <div
                    className={clsx('w-full rounded-t-lg', isToday ? 'bg-yellow' : 'bg-ink')}
                    style={{ height: `${Math.max(4, (w.bookings / maxWeek) * 100)}%` }}
                    aria-label={`${dayText(w.date)}: ${w.bookings} bookings, ${inr(w.revenue)} collected`}
                  />
                  <span className={clsx('truncate text-[11px]', isToday ? 'font-bold' : 'text-mute')}>
                    {dayText(w.date).split(',')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5" aria-labelledby="top-title">
          <h2 id="top-title" className="font-display text-lg font-bold">
            Top services
          </h2>
          {data.topServices.length === 0 ? (
            <p className="mt-4 text-sm text-mute">No bookings yet.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {data.topServices.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-paper text-xs font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-mute">{t.qty} booked</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            {(['completed', 'cancelled', 'in_progress'] as const).map((s) => (
              <div key={s}>
                <p className="font-display text-xl font-bold">{data.statusCounts[s] || 0}</p>
                <p className="text-[11px] text-mute capitalize">{s.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="unassigned-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="unassigned-title" className="font-display text-lg font-bold">
              Needs a professional
            </h2>
            <Link to="/bookings?status=pending" className="inline-flex items-center gap-1 text-sm font-semibold">
              All <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {data.unassigned.length === 0 ? (
            <p className="px-5 py-8 text-sm text-mute">Every booking has a professional. Nice.</p>
          ) : (
            <ul>
              {data.unassigned.map((b) => (
                <li key={b.id} className="border-b border-line last:border-0">
                  <Link to={`/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper">
                    <span className="size-2 shrink-0 rounded-full bg-yellow-deep" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {b.code} · {b.categoryName}
                      </p>
                      <p className="truncate text-xs text-mute">
                        {slotText(b.slot)} · {b.cityName} · {person(b.customer)?.name || 'Customer'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{inr(b.pricing.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="recent-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="recent-title" className="font-display text-lg font-bold">
              Latest bookings
            </h2>
            <Link to="/bookings" className="inline-flex items-center gap-1 text-sm font-semibold">
              All <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-mute">No bookings yet.</p>
          ) : (
            <ul>
              {data.recent.map((b) => (
                <li key={b.id} className="border-b border-line last:border-0">
                  <Link to={`/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {b.code} · {b.items[0]?.name}
                        {b.items.length > 1 ? ` +${b.items.length - 1}` : ''}
                      </p>
                      <p className="truncate text-xs text-mute">
                        {person(b.customer)?.name || 'Customer'} · {slotText(b.slot)}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
