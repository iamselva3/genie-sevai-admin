import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorBox,
  PageHeader,
  Pagination,
  SelectField,
  Spinner,
  StatusBadge,
  TableWrap,
  TextField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { BOOKING_STATUSES, inr, person, slotText, STATUS_LABEL } from '../lib/format';
import { asOptions, useCategories, useCities } from '../lib/lookups';
import type { Booking, Paged } from '../lib/types';
import { useIsDesktop } from '../lib/useMedia';

const FILTER_KEYS = ['status', 'city', 'category', 'date', 'q'] as const;

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const isDesktop = useIsDesktop();
  const page = Math.max(1, Number(params.get('page') || 1));
  const [search, setSearch] = useState(params.get('q') || '');

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])) as Record<(typeof FILTER_KEYS)[number], string>;

  useEffect(() => setSearch(params.get('q') || ''), [params]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'bookings', filters, page],
    queryFn: () => api<Paged<Booking>>('/admin/bookings', { query: { ...filters, page, limit: 20 } }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={data ? `${data.total} booking${data.total === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}` : 'All customer bookings'}
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter('q', search.trim());
          }}
          className="relative"
        >
          <TextField
            label="Search"
            id="booking-search"
            placeholder="Code, customer name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => search.trim() !== filters.q && setFilter('q', search.trim())}
          />
          <Search className="pointer-events-none absolute right-3 bottom-3 size-4 text-mute" aria-hidden="true" />
        </form>
        <SelectField
          label="Status"
          id="filter-status"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          placeholder="All statuses"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        />
        <SelectField
          label="City"
          id="filter-city"
          value={filters.city}
          onChange={(e) => setFilter('city', e.target.value)}
          placeholder="All cities"
          options={asOptions(cities)}
        />
        <SelectField
          label="Category"
          id="filter-category"
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          placeholder="All categories"
          options={asOptions(categories)}
        />
        <TextField label="Service date" id="filter-date" type="date" value={filters.date} onChange={(e) => setFilter('date', e.target.value)} />
        <Button variant="ghost" onClick={() => setParams(new URLSearchParams(), { replace: true })} disabled={!hasFilters}>
          Clear
        </Button>
      </div>

      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}

      <div className="card overflow-hidden" aria-busy={isFetching}>
        {isLoading ? (
          <Spinner label="Loading bookings" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No bookings" body={hasFilters ? 'Try removing a filter.' : 'Bookings will appear here as customers place them.'} />
        ) : (
          <>
            {isDesktop ? (
              <TableWrap>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Customer</th>
                      <th>Slot</th>
                      <th>Professional</th>
                      <th className="text-right">Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((b) => {
                      const customer = person(b.customer);
                      const pro = person(b.professional);
                      return (
                        <tr
                          key={b.id}
                          data-testid="booking-row"
                          data-code={b.code}
                          className="cursor-pointer"
                          onClick={() => navigate(`/bookings/${b.id}`)}
                        >
                          <td>
                            <Link to={`/bookings/${b.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                              {b.code}
                            </Link>
                            <p className="max-w-[220px] truncate text-xs text-mute">
                              {b.categoryName} · {b.items.map((i) => i.name).join(', ')}
                            </p>
                          </td>
                          <td>
                            <p className="font-medium">{customer?.name || 'Customer'}</p>
                            <p className="text-xs text-mute">{customer?.phone}</p>
                          </td>
                          <td className="whitespace-nowrap">
                            {slotText(b.slot)}
                            <p className="text-xs text-mute">{b.cityName}</p>
                          </td>
                          <td>{pro ? pro.name : <span className="text-mute">—</span>}</td>
                          <td className="text-right font-semibold">{inr(b.pricing.total)}</td>
                          <td>
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
            <ul>
              {data.items.map((b) => {
                const customer = person(b.customer);
                const pro = person(b.professional);
                return (
                  <li key={b.id} data-testid="booking-row" data-code={b.code} className="border-b border-line last:border-0">
                    <Link to={`/bookings/${b.id}`} className="flex flex-col gap-1.5 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{b.code}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="truncate text-sm">
                        {b.categoryName} · {b.items.map((i) => i.name).join(', ')}
                      </p>
                      <p className="text-xs text-mute">
                        {slotText(b.slot)} · {b.cityName}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-mute">
                          {customer?.name || 'Customer'} {pro ? `· ${pro.name}` : ''}
                        </span>
                        <span className="text-sm font-semibold">{inr(b.pricing.total)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            )}
            <Pagination
              page={data.page}
              pages={data.pages}
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', String(p));
                setParams(next);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
