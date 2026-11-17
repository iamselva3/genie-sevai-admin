import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListInput } from '../components/ListInput';
import { ConfirmDialog, Drawer, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Button,
  CheckboxField,
  EmptyState,
  ErrorBox,
  IconButton,
  PageHeader,
  SelectField,
  Spinner,
  TableWrap,
  TextAreaField,
  TextField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { inr, minutesText } from '../lib/format';
import { CategoryIcon } from '../lib/icons';
import { asOptions, useCategories, useCities } from '../lib/lookups';
import type { Service, ServiceStatus } from '../lib/types';

const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: 'active', label: 'Live' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'hidden', label: 'Hidden' },
];

const LIST_KEY = ['admin', 'services'];

export default function ServicesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: categories } = useCategories();
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get('category') || '');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [askReason, setAskReason] = useState<Service | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => api<{ services: Service[] }>('/admin/services').then((r) => r.services),
  });

  const statusMutation = useMutation({
    mutationFn: (v: { service: Service; status: ServiceStatus; reason?: string }) =>
      api<{ service: Service }>(`/admin/services/${v.service.id}/status`, {
        method: 'PATCH',
        body: { status: v.status, ...(v.reason !== undefined ? { unavailableReason: v.reason } : {}) },
      }).then((r) => r.service),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const previous = qc.getQueryData<Service[]>(LIST_KEY);
      qc.setQueryData<Service[]>(LIST_KEY, (list) =>
        list?.map((s) => (s.id === v.service.id ? { ...s, status: v.status, unavailableReason: v.reason ?? s.unavailableReason } : s)),
      );
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(LIST_KEY, ctx.previous);
      toast.error(errorMessage(err));
    },
    onSuccess: (service) => {
      qc.setQueryData<Service[]>(LIST_KEY, (list) => list?.map((s) => (s.id === service.id ? { ...s, ...service, cities: s.cities } : s)));
      const label = STATUS_OPTIONS.find((o) => o.value === service.status)?.label;
      toast.success(`${service.name} is now ${label?.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (s: Service) => api(`/admin/services/${s.id}`, { method: 'DELETE' }),
    onSuccess: (_r, s) => {
      qc.setQueryData<Service[]>(LIST_KEY, (list) => list?.filter((x) => x.id !== s.id));
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success(`${s.name} deleted`);
      setDeleting(null);
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || []).filter(
      (s) =>
        (!category || s.category?.id === category) &&
        (!status || s.status === status) &&
        (!needle || s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle) || s.slug.includes(needle)),
    );
  }, [data, category, status, q]);

  const groups = useMemo(() => {
    const order = new Map((categories || []).map((c, i) => [c.id, i]));
    const map = new Map<string, { id: string; name: string; icon: string; items: Service[] }>();
    for (const s of filtered) {
      const id = s.category?.id || 'none';
      if (!map.has(id)) {
        const cat = categories?.find((c) => c.id === id);
        map.set(id, { id, name: s.category?.name || 'No category', icon: cat?.icon || 'wrench', items: [] });
      }
      map.get(id)!.items.push(s);
    }
    return [...map.values()].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }, [filtered, categories]);

  const counts = useMemo(() => {
    const c = { active: 0, unavailable: 0, hidden: 0 };
    for (const s of data || []) c[s.status] += 1;
    return c;
  }, [data]);

  const setServiceStatus = (service: Service, next: ServiceStatus) => {
    if (next === service.status) return;
    if (next === 'unavailable') {
      setAskReason(service);
      return;
    }
    statusMutation.mutate({ service, status: next });
  };

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle={
          data ? (
            <>
              <strong className="text-ink">{counts.active}</strong> live · <strong className="text-ink">{counts.unavailable}</strong> unavailable ·{' '}
              <strong className="text-ink">{counts.hidden}</strong> hidden. Live services can be booked; unavailable ones are shown but can’t be booked; hidden ones are not shown.
            </>
          ) : (
            'Control what customers can see and book.'
          )
        }
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New service
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <TextField label="Search" id="service-search" placeholder="Name or group" value={q} onChange={(e) => setQ(e.target.value)} />
          <Search className="pointer-events-none absolute right-3 bottom-3 size-4 text-mute" aria-hidden="true" />
        </div>
        <SelectField
          label="Category"
          id="service-category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="All categories"
          options={asOptions(categories)}
        />
        <SelectField
          label="Status"
          id="service-status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Any status"
          options={STATUS_OPTIONS}
        />
      </div>

      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading services" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No services" body="Nothing matches these filters." />
        ) : (
          <TableWrap>
            <table className="table min-w-[860px]">
              <thead>
                <tr>
                  <th>Service</th>
                  <th className="text-right">Price</th>
                  <th>Duration</th>
                  <th>Cities</th>
                  <th>Status on site</th>
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.id}>
                    <tr>
                      <td colSpan={6} className="!bg-paper !py-2">
                        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
                          <CategoryIcon name={g.icon} className="size-4" />
                          {g.name} <span className="font-medium text-mute">· {g.items.length}</span>
                        </span>
                      </td>
                    </tr>
                    {g.items.map((s) => (
                      <tr key={s.id} data-testid="service-row" data-slug={s.slug} data-status={s.status}>
                        <td>
                          <p className="font-semibold">
                            {s.name}
                            {s.isPopular && <span className="ml-2 rounded bg-yellow px-1.5 py-0.5 text-[10px] font-bold uppercase">Popular</span>}
                          </p>
                          <p className="text-xs text-mute">
                            {s.group}
                            {s.status === 'unavailable' && s.unavailableReason ? ` · “${s.unavailableReason}”` : ''}
                          </p>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span className="font-semibold">{inr(s.price)}</span>
                          {s.mrp > s.price && <span className="ml-1.5 text-xs text-mute line-through">{inr(s.mrp)}</span>}
                        </td>
                        <td className="whitespace-nowrap">{minutesText(s.durationMinutes)}</td>
                        <td className="max-w-[180px] truncate text-xs">
                          {s.cities.length === 0 ? <span className="text-mute">All cities</span> : s.cities.map((c) => c.name).join(', ')}
                        </td>
                        <td>
                          <StatusControl service={s} onChange={(next) => setServiceStatus(s, next)} />
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <IconButton label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </IconButton>
                            <IconButton label={`Delete ${s.name}`} onClick={() => setDeleting(s)} className="hover:text-bad">
                              <Trash2 className="size-4" aria-hidden="true" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>

      <UnavailableModal
        service={askReason}
        onClose={() => setAskReason(null)}
        onConfirm={(reason) => {
          if (askReason) statusMutation.mutate({ service: askReason, status: 'unavailable', reason });
          setAskReason(null);
        }}
      />

      <ServiceForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        service={editing === 'new' ? null : editing}
        defaultCategory={category}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          qc.invalidateQueries({ queryKey: LIST_KEY });
          qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
          toast.success(isNew ? `${saved.name} created` : `${saved.name} saved`);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this service?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be removed for good. Past bookings keep their details. To pause it instead, set it to Hidden.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={deleteMutation.isPending}
        error={deleteMutation.error ? errorMessage(deleteMutation.error) : null}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onClose={() => {
          deleteMutation.reset();
          setDeleting(null);
        }}
      />
    </div>
  );
}

function StatusControl({ service, onChange }: { service: Service; onChange: (s: ServiceStatus) => void }) {
  return (
    <div role="group" aria-label={`Status of ${service.name}`} className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {STATUS_OPTIONS.map((o) => {
        const active = service.status === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-7 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
              active && o.value === 'active' && 'bg-ink text-white',
              active && o.value === 'unavailable' && 'bg-yellow text-ink',
              active && o.value === 'hidden' && 'border border-line bg-white text-mute',
              !active && 'text-mute hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function UnavailableModal({
  service,
  onClose,
  onConfirm,
}: {
  service: Service | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const close = () => {
    setReason('');
    onClose();
  };
  return (
    <Modal
      open={!!service}
      onClose={close}
      title="Mark as unavailable"
      description={service ? `${service.name} stays visible but customers can’t book it.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Back
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              onConfirm(reason.trim());
              setReason('');
            }}
          >
            Confirm
          </Button>
        </>
      }
    >
      <TextField
        label="Reason"
        id="unavailable-reason"
        value={reason}
        maxLength={120}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Back next week"
        hint="Optional. Shown to customers next to the service."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm(reason.trim());
            setReason('');
          }
        }}
      />
    </Modal>
  );
}

interface ServiceDraft {
  category: string;
  name: string;
  group: string;
  shortDescription: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  price: string;
  mrp: string;
  durationMinutes: string;
  status: ServiceStatus;
  unavailableReason: string;
  cities: string[];
  isPopular: boolean;
  sortOrder: string;
  imageUrl: string;
}

function toDraft(s: Service | null, defaultCategory: string): ServiceDraft {
  return {
    category: s?.category?.id || defaultCategory,
    name: s?.name || '',
    group: s?.group || '',
    shortDescription: s?.shortDescription || '',
    description: s?.description || '',
    inclusions: s?.inclusions || [],
    exclusions: s?.exclusions || [],
    price: s ? String(s.price) : '',
    mrp: s?.mrp ? String(s.mrp) : '',
    durationMinutes: s ? String(s.durationMinutes) : '60',
    status: s?.status || 'active',
    unavailableReason: s?.unavailableReason || '',
    cities: s?.cities.map((c) => c.id) || [],
    isPopular: s?.isPopular || false,
    sortOrder: s ? String(s.sortOrder) : '0',
    imageUrl: s?.imageUrl || '',
  };
}

function ServiceForm({
  open,
  service,
  defaultCategory,
  onClose,
  onSaved,
}: {
  open: boolean;
  service: Service | null;
  defaultCategory: string;
  onClose: () => void;
  onSaved: (s: Service, isNew: boolean) => void;
}) {
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  // The parent remounts this form (via `key`) each time it opens, so initial state is always fresh.
  const [draft, setDraft] = useState<ServiceDraft>(() => toDraft(service, defaultCategory));
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceDraft, string>>>({});

  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      service
        ? api<{ service: Service }>(`/admin/services/${service.id}`, { method: 'PATCH', body }).then((r) => r.service)
        : api<{ service: Service }>('/admin/services', { method: 'POST', body }).then((r) => r.service),
    onSuccess: (s) => onSaved(s, !service),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const price = Number(draft.price);
    const mrp = draft.mrp ? Number(draft.mrp) : 0;
    const duration = Number(draft.durationMinutes);
    if (!draft.category) next.category = 'Choose a category';
    if (draft.name.trim().length < 2) next.name = 'Enter a name';
    if (draft.price === '' || !Number.isInteger(price) || price < 0) next.price = 'Enter a whole rupee amount';
    if (draft.mrp && (!Number.isInteger(mrp) || mrp < 0)) next.mrp = 'Enter a whole rupee amount';
    if (!Number.isInteger(duration) || duration < 10) next.durationMinutes = 'At least 10 minutes';
    if (draft.imageUrl && !/^https?:\/\/\S+$/i.test(draft.imageUrl.trim())) next.imageUrl = 'Enter a full URL (https://…)';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      category: draft.category,
      name: draft.name.trim(),
      group: draft.group.trim() || 'General',
      shortDescription: draft.shortDescription.trim(),
      description: draft.description.trim(),
      inclusions: draft.inclusions,
      exclusions: draft.exclusions,
      price,
      mrp,
      durationMinutes: duration,
      status: draft.status,
      unavailableReason: draft.status === 'unavailable' ? draft.unavailableReason.trim() : '',
      cities: draft.cities,
      isPopular: draft.isPopular,
      sortOrder: Number(draft.sortOrder) || 0,
      imageUrl: draft.imageUrl.trim(),
    });
  };

  const activeCities = (cities || []).filter((c) => c.isActive || draft.cities.includes(c.id));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={service ? 'Edit service' : 'New service'}
      description={service ? service.slug : 'Customers see this in the category page.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="service-form" busy={mutation.isPending}>
            Save service
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <SelectField
          label="Category"
          id="svc-category"
          value={draft.category}
          onChange={(e) => set('category', e.target.value)}
          placeholder="Choose a category"
          options={asOptions(categories)}
          error={errors.category}
        />
        <TextField label="Name" id="svc-name" value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={100} error={errors.name} />
        <TextField
          label="Group"
          id="svc-group"
          value={draft.group}
          onChange={(e) => set('group', e.target.value)}
          maxLength={60}
          hint="Sub-heading on the category page, e.g. Bathroom, Kitchen"
        />
        <TextField
          label="Short description"
          id="svc-short"
          value={draft.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          maxLength={200}
        />
        <TextAreaField label="Description" id="svc-description" value={draft.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Price (₹)" id="svc-price" inputMode="numeric" value={draft.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} error={errors.price} />
          <TextField label="MRP (₹)" id="svc-mrp" inputMode="numeric" value={draft.mrp} onChange={(e) => set('mrp', e.target.value.replace(/\D/g, ''))} error={errors.mrp} hint="Optional" />
          <TextField
            label="Duration (min)"
            id="svc-duration"
            inputMode="numeric"
            value={draft.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value.replace(/\D/g, ''))}
            error={errors.durationMinutes}
          />
        </div>
        <ListInput label="What's included" values={draft.inclusions} onChange={(v) => set('inclusions', v)} placeholder="e.g. Machines & chemicals" />
        <ListInput label="Not included" values={draft.exclusions} onChange={(v) => set('exclusions', v)} placeholder="e.g. Spare parts" />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Cities</legend>
          <p className="text-xs text-mute">{draft.cities.length === 0 ? 'Offered in all cities. Tick cities to limit it.' : `Only in ${draft.cities.length} selected cit${draft.cities.length === 1 ? 'y' : 'ies'}.`}</p>
          <div className="flex flex-wrap gap-2">
            {activeCities.map((c) => {
              const on = draft.cities.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('cities', on ? draft.cities.filter((x) => x !== c.id) : [...draft.cities, c.id])}
                  className={clsx(
                    'h-8 rounded-full border px-3 text-[13px] font-medium',
                    on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                  )}
                >
                  {c.name}
                </button>
              );
            })}
            {draft.cities.length > 0 && (
              <button type="button" onClick={() => set('cities', [])} className="h-8 px-2 text-[13px] font-semibold underline">
                All cities
              </button>
            )}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Status on site"
            id="svc-status"
            value={draft.status}
            onChange={(e) => set('status', e.target.value as ServiceStatus)}
            options={STATUS_OPTIONS}
          />
          <TextField label="Sort order" id="svc-sort" inputMode="numeric" value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value.replace(/[^\d-]/g, ''))} />
        </div>
        {draft.status === 'unavailable' && (
          <TextField
            label="Unavailable reason"
            id="svc-reason"
            value={draft.unavailableReason}
            onChange={(e) => set('unavailableReason', e.target.value)}
            maxLength={120}
            hint="Shown to customers"
          />
        )}
        <TextField label="Image URL" id="svc-image" value={draft.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" error={errors.imageUrl} hint="Optional. The category icon is used when empty." />
        <CheckboxField label="Show in “Popular” on the home page" checked={draft.isPopular} onChange={(v) => set('isPopular', v)} />
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Drawer>
  );
}
