import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorBox, PageHeader, Pagination, Spinner, Switch, TableWrap, TextField } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateText, inr } from '../lib/format';
import type { Customer, Paged } from '../lib/types';
import { useDebounced } from '../lib/useDebounced';

export default function CustomersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [blocking, setBlocking] = useState<Customer | null>(null);
  const search = useDebounced(q.trim());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'customers', search, page],
    queryFn: () => api<Paged<Customer>>('/admin/customers', { query: { q: search, page, limit: 20 } }),
    placeholderData: keepPreviousData,
  });

  const block = useMutation({
    mutationFn: (v: { customer: Customer; isBlocked: boolean }) =>
      api<{ customer: Customer }>(`/admin/customers/${v.customer.id}`, { method: 'PATCH', body: { isBlocked: v.isBlocked } }).then((r) => r.customer),
    onSuccess: (c) => {
      toast.success(c.isBlocked ? `${c.name || c.email} is blocked` : `${c.name || c.email} can book again`);
      setBlocking(null);
      qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'customer', c.id] });
    },
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={data ? `${data.total} customer${data.total === 1 ? '' : 's'}` : 'Everyone who has signed in'} />
      <div className="card mb-4 p-4">
        <div className="relative max-w-md">
          <TextField
            label="Search"
            id="customer-search"
            placeholder="Name, phone or email"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Search className="pointer-events-none absolute right-3 bottom-3 size-4 text-mute" aria-hidden="true" />
        </div>
      </div>
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading customers" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No customers" body={search ? 'Nobody matches this search.' : 'Customers appear after they sign in.'} />
        ) : (
          <>
            <TableWrap>
              <table className="table min-w-[680px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Bookings</th>
                    <th className="text-right">Spent</th>
                    <th>Joined</th>
                    <th>Can book</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/customers/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.name || 'Customer'} />
                          <span>
                            <span className="block font-semibold hover:underline">{c.name || 'No name yet'}</span>
                            <span className="block text-xs text-mute">{c.email || '—'}</span>
                          </span>
                        </Link>
                      </td>
                      <td>{c.phone || <span className="text-mute">Not added yet</span>}</td>
                      <td>{c.bookings ?? 0}</td>
                      <td className="text-right font-semibold">{inr(c.spent)}</td>
                      <td className="whitespace-nowrap">{dateText(c.createdAt)}</td>
                      <td>
                        <Switch
                          checked={!c.isBlocked}
                          label={`${c.name || c.email} can book`}
                          text={c.isBlocked ? 'Blocked' : 'Allowed'}
                          onChange={(allowed) => (allowed ? block.mutate({ customer: c, isBlocked: false }) : setBlocking(c))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!blocking}
        title="Block this customer?"
        message={
          <>
            <strong>{blocking?.name || blocking?.email}</strong> will be signed out and won’t be able to book until you unblock them.
          </>
        }
        confirmLabel="Block"
        danger
        busy={block.isPending}
        error={block.error ? errorMessage(block.error) : null}
        onConfirm={() => blocking && block.mutate({ customer: blocking, isBlocked: true })}
        onClose={() => {
          block.reset();
          setBlocking(null);
        }}
      />
    </div>
  );
}
