import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, PageHeader, Pill, Spinner } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateTimeText } from '../lib/format';
import type { Enquiry } from '../lib/types';

type Filter = 'open' | 'resolved' | '';

export default function EnquiriesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'enquiries', filter],
    queryFn: () => api<{ enquiries: Enquiry[] }>('/admin/enquiries', { query: { status: filter } }).then((r) => r.enquiries),
  });
  const update = useMutation({
    mutationFn: (v: { enquiry: Enquiry; status: 'open' | 'resolved' }) => api(`/admin/enquiries/${v.enquiry.id}`, { method: 'PATCH', body: { status: v.status } }),
    onSuccess: (_r, v) => {
      toast.success(v.status === 'resolved' ? 'Marked as resolved' : 'Reopened');
      qc.invalidateQueries({ queryKey: ['admin', 'enquiries'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Messages from the Help page."
        actions={
          <div role="group" aria-label="Filter" className="inline-flex rounded-xl border border-line bg-white p-1">
            {(
              [
                ['open', 'Open'],
                ['resolved', 'Resolved'],
                ['', 'All'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
                className={clsx('h-8 rounded-lg px-3 text-sm font-semibold', filter === v ? 'bg-ink text-white' : 'hover:bg-black/5')}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      {isLoading ? (
        <Spinner label="Loading enquiries" />
      ) : !data || data.length === 0 ? (
        <div className="card">
          <EmptyState title={filter === 'open' ? 'Inbox zero' : 'No enquiries'} body={filter === 'open' ? 'No open enquiries right now.' : undefined} />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((e) => (
            <li key={e.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{e.name}</p>
                    <Pill>{e.topic || 'General'}</Pill>
                    {e.bookingCode && <Pill tone="ink">{e.bookingCode}</Pill>}
                    {e.status === 'resolved' && <Pill tone="ok">Resolved</Pill>}
                  </div>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
                    <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 hover:text-ink">
                      <Phone className="size-3" aria-hidden="true" /> {e.phone}
                    </a>
                    {e.email && (
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                        <Mail className="size-3" aria-hidden="true" /> {e.email}
                      </a>
                    )}
                    <span>{dateTimeText(e.createdAt)}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={e.status === 'open' ? 'primary' : 'outline'}
                  busy={update.isPending && update.variables?.enquiry.id === e.id}
                  onClick={() => update.mutate({ enquiry: e, status: e.status === 'open' ? 'resolved' : 'open' })}
                >
                  {e.status === 'open' ? 'Mark resolved' : 'Reopen'}
                </Button>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line">{e.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
