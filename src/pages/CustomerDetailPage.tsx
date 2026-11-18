import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorBox, KeyValue, Pill, Spinner, StatusBadge, Switch, TableWrap } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateText, inr, slotText } from '../lib/format';
import type { Booking, Customer } from '../lib/types';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['admin', 'customer', id];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api<{ customer: Customer; bookings: Booking[] }>(`/admin/customers/${id}`),
  });
  const block = useMutation({
    mutationFn: (isBlocked: boolean) => api<{ customer: Customer }>(`/admin/customers/${id}`, { method: 'PATCH', body: { isBlocked } }).then((r) => r.customer),
    onSuccess: (c) => {
      toast.success(c.isBlocked ? 'Customer blocked' : 'Customer unblocked');
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <Spinner label="Loading customer" />;
  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Back />
        <ErrorBox message={errorMessage(error, 'Customer not found')} onRetry={() => refetch()} />
      </div>
    );
  }
  const { customer: c, bookings } = data;
  const spent = bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricing.total, 0);

  return (
    <div>
      <Back />
      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={c.name || 'Customer'} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{c.name || 'No name yet'}</h1>
              {c.isBlocked && <Pill tone="bad">Blocked</Pill>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                  <Mail className="size-3.5" aria-hidden="true" /> {c.email}
                </a>
              )}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-ink">
                  <Phone className="size-3.5" aria-hidden="true" /> {c.phone}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" aria-hidden="true" /> No mobile number yet
                </span>
              )}
            </div>
          </div>
        </div>
        <Switch checked={!c.isBlocked} label="Customer can book" text={c.isBlocked ? 'Blocked' : 'Can book'} busy={block.isPending} onChange={(allowed) => block.mutate(!allowed)} />
      </div>

      <div className="card mb-4 grid gap-4 p-5 sm:grid-cols-4">
        <KeyValue label="Email">{c.email || '—'}</KeyValue>
        <KeyValue label="Joined">{dateText(c.createdAt)}</KeyValue>
        <KeyValue label="Bookings">{bookings.length}</KeyValue>
        <KeyValue label="Spent">{inr(spent)}</KeyValue>
      </div>

      {c.addresses.length > 0 && (
        <section className="card mb-4 p-5">
          <h2 className="mb-3 font-display text-base font-bold">Saved addresses</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
                <p className="font-semibold">
                  {a.label} {a.isDefault && <span className="font-normal text-mute">· default</span>}
                </p>
                <p>
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}
                </p>
                <p className="text-mute capitalize">
                  {a.city} {a.pincode}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 font-display text-base font-bold">Bookings</h2>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <TableWrap>
            <table className="table min-w-[600px]">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Slot</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/bookings/${b.id}`} className="font-semibold hover:underline">
                        {b.code}
                      </Link>
                      <p className="max-w-[260px] truncate text-xs text-mute">
                        {b.categoryName} · {b.items.map((i) => i.name).join(', ')}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">{slotText(b.slot)}</td>
                    <td className="text-right font-semibold">{inr(b.pricing.total)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}

function Back() {
  return (
    <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Customers
    </Link>
  );
}
