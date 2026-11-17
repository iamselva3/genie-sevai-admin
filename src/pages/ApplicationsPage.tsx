import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { ProfessionalForm, type ProfessionalPrefill } from '../components/ProfessionalForm';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, PageHeader, Pill, SelectField, Spinner } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateTimeText } from '../lib/format';
import type { ApplicationStatus, ProApplication } from '../lib/types';

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [converting, setConverting] = useState<ProApplication | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'applications', filter],
    queryFn: () => api<{ applications: ProApplication[] }>('/admin/applications', { query: { status: filter } }).then((r) => r.applications),
  });
  const update = useMutation({
    mutationFn: (v: { app: ProApplication; status: ApplicationStatus }) => api(`/admin/applications/${v.app.id}`, { method: 'PATCH', body: { status: v.status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const prefill: ProfessionalPrefill | undefined = converting
    ? {
        name: converting.name,
        phone: converting.phone,
        cityName: converting.city,
        experienceYears: converting.experienceYears,
        bio: converting.skills.join(', '),
      }
    : undefined;

  return (
    <div>
      <PageHeader
        title="Pro applications"
        subtitle="People who applied to join from the website."
        actions={
          <SelectField
            label="Status"
            id="application-filter"
            className="min-w-[160px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="All"
            options={STATUSES}
          />
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      {isLoading ? (
        <Spinner label="Loading applications" />
      ) : !data || data.length === 0 ? (
        <div className="card">
          <EmptyState title="No applications" />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="card flex flex-col gap-3 p-4" data-testid="application-row">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold">{a.name}</p>
                  <p className="text-xs text-mute">
                    {a.city} · {a.experienceYears} yrs · applied {dateTimeText(a.createdAt)}
                  </p>
                </div>
                <Pill tone={a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'bad' : a.status === 'new' ? 'yellow' : 'neutral'}>
                  {STATUSES.find((s) => s.value === a.status)?.label}
                </Pill>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.skills.map((s) => (
                  <Pill key={s}>{s}</Pill>
                ))}
              </div>
              {a.message && <p className="text-sm">{a.message}</p>}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
                <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                  <Phone className="size-3.5" aria-hidden="true" /> {a.phone}
                </a>
                <div className="flex items-end gap-2">
                  <SelectField
                    label="Update status"
                    id={`app-status-${a.id}`}
                    value={a.status}
                    onChange={(e) => update.mutate({ app: a, status: e.target.value as ApplicationStatus })}
                    options={STATUSES}
                  />
                  <Button variant="accent" icon={<UserPlus className="size-4" aria-hidden="true" />} onClick={() => setConverting(a)}>
                    Create professional
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProfessionalForm
        key={converting?.id || 'closed'}
        open={!!converting}
        professional={null}
        prefill={prefill}
        onClose={() => setConverting(null)}
        onSaved={(p) => {
          toast.success(`${p.name} added to the team`);
          if (converting && converting.status !== 'approved') update.mutate({ app: converting, status: 'approved' });
          qc.invalidateQueries({ queryKey: ['admin', 'professionals'] });
          setConverting(null);
        }}
      />
    </div>
  );
}
