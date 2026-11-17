import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProfessionalForm } from '../components/ProfessionalForm';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState, ErrorBox, KeyValue, Pill, Spinner, Stars, StatusBadge, TableWrap } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateText, inr, person, refName, slotText } from '../lib/format';
import type { Booking, Professional } from '../lib/types';

export default function ProfessionalDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'professional', id],
    queryFn: () => api<{ professional: Professional; jobs: Booking[] }>(`/admin/professionals/${id}`),
  });

  if (isLoading) return <Spinner label="Loading professional" />;
  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Back />
        <ErrorBox message={errorMessage(error, 'Professional not found')} onRetry={() => refetch()} />
      </div>
    );
  }
  const { professional: p, jobs } = data;
  const active = jobs.filter((j) => ['assigned', 'on_the_way', 'in_progress'].includes(j.status));

  return (
    <div>
      <Back />
      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={p.name} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{p.name}</h1>
              {p.status === 'active' ? <Pill tone="ok">Active</Pill> : <Pill>Inactive</Pill>}
            </div>
            <a href={`tel:${p.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm text-mute hover:text-ink">
              <Phone className="size-3.5" aria-hidden="true" /> {p.phone}
            </a>
          </div>
        </div>
        <Button variant="outline" icon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <div className="card mb-4 grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <KeyValue label="City">{refName(p.city)}</KeyValue>
        <KeyValue label="Rating">
          <Stars value={p.rating} /> <span className="text-xs text-mute">({p.ratingCount})</span>
        </KeyValue>
        <KeyValue label="Jobs done">{p.jobsCompleted}</KeyValue>
        <KeyValue label="Active jobs">{active.length}</KeyValue>
        <KeyValue label="Experience">{p.experienceYears} yrs</KeyValue>
        <KeyValue label="Joined">{dateText(p.createdAt)}</KeyValue>
        <div className="sm:col-span-3 lg:col-span-6">
          <KeyValue label="Skills">
            <span className="flex flex-wrap gap-1.5 pt-1">
              {p.skills.map((s) => (
                <Pill key={typeof s === 'string' ? s : s.id}>{refName(s)}</Pill>
              ))}
            </span>
          </KeyValue>
        </div>
        {p.bio && (
          <div className="sm:col-span-3 lg:col-span-6">
            <KeyValue label="Bio">{p.bio}</KeyValue>
          </div>
        )}
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 font-display text-base font-bold">Recent jobs</h2>
        {jobs.length === 0 ? (
          <EmptyState title="No jobs yet" />
        ) : (
          <TableWrap>
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Slot</th>
                  <th>Customer</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link to={`/bookings/${j.id}`} className="font-semibold hover:underline">
                        {j.code}
                      </Link>
                      <p className="max-w-[220px] truncate text-xs text-mute">{j.items.map((i) => i.name).join(', ')}</p>
                    </td>
                    <td className="whitespace-nowrap">{slotText(j.slot)}</td>
                    <td>{person(j.customer)?.name || 'Customer'}</td>
                    <td className="text-right font-semibold">{inr(j.pricing.total)}</td>
                    <td>
                      <StatusBadge status={j.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>

      <ProfessionalForm
        key={editing ? 'open' : 'closed'}
        open={editing}
        professional={p}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          toast.success(`${saved.name} saved`);
          qc.invalidateQueries({ queryKey: ['admin', 'professional', id] });
          qc.invalidateQueries({ queryKey: ['admin', 'professionals'] });
          setEditing(false);
        }}
      />
    </div>
  );
}

function Back() {
  return (
    <Link to="/professionals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Professionals
    </Link>
  );
}
