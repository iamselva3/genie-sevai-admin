import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, PageHeader, Pagination, Pill, Spinner } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateTimeText } from '../lib/format';
import type { Paged, ReviewRow } from '../lib/types';

export default function ReviewsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'reviews', page],
    queryFn: () => api<Paged<ReviewRow>>('/admin/reviews', { query: { page, limit: 20 } }),
    placeholderData: keepPreviousData,
  });

  const hide = useMutation({
    mutationFn: (v: { row: ReviewRow; hidden: boolean }) => api(`/admin/reviews/${v.row.bookingId}`, { method: 'PATCH', body: { hidden: v.hidden } }),
    onSuccess: (_r, v) => {
      toast.success(v.hidden ? 'Review hidden' : 'Review visible again');
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Ratings customers left after completed jobs. Hidden reviews aren’t shown to professionals." />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      {isLoading ? (
        <Spinner label="Loading reviews" />
      ) : !data || data.items.length === 0 ? (
        <div className="card">
          <EmptyState title="No reviews yet" />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map((r) => (
              <li key={r.bookingId} className={clsx('card flex flex-col gap-3 p-4', r.review.hidden && 'bg-paper')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-yellow font-display text-lg font-bold">{r.review.rating}</span>
                    <div>
                      <p className="text-sm font-semibold" aria-label={`${r.review.rating} out of 5`}>
                        <span aria-hidden="true">
                          {'★'.repeat(r.review.rating)}
                          <span className="text-line">{'★'.repeat(5 - r.review.rating)}</span>
                        </span>
                      </p>
                      <p className="text-xs text-mute">{dateTimeText(r.review.at)}</p>
                    </div>
                  </div>
                  {r.review.hidden && <Pill tone="warn">Hidden</Pill>}
                </div>
                <p className="text-sm">{r.review.comment ? `“${r.review.comment}”` : <span className="text-mute">No comment</span>}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-mute">
                  <span>
                    <Link to={`/bookings/${r.bookingId}`} className="font-semibold text-ink hover:underline">
                      {r.code}
                    </Link>{' '}
                    · {r.customer?.name || 'Customer'} → {r.professional?.name || 'Professional'}
                  </span>
                  <Button size="sm" variant="outline" busy={hide.isPending && hide.variables?.row.bookingId === r.bookingId} onClick={() => hide.mutate({ row: r, hidden: !r.review.hidden })}>
                    {r.review.hidden ? 'Unhide' : 'Hide'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="card mt-3">
            <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
