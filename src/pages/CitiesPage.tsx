import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, IconButton, PageHeader, Spinner, Switch, TableWrap, TextField } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useCities } from '../lib/lookups';
import type { City } from '../lib/types';

const KEY = ['admin', 'cities'];

export default function CitiesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useCities();
  const [editing, setEditing] = useState<City | 'new' | null>(null);
  const [deleting, setDeleting] = useState<City | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { city: City; isActive: boolean }) =>
      api<{ city: City }>(`/admin/cities/${v.city.id}`, { method: 'PATCH', body: { isActive: v.isActive } }).then((r) => r.city),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<City[]>(KEY);
      qc.setQueryData<City[]>(KEY, (list) => list?.map((c) => (c.id === v.city.id ? { ...c, isActive: v.isActive } : c)));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
      toast.error(errorMessage(err));
    },
    onSuccess: (c) => {
      toast.success(c.isActive ? `${c.name} is open for bookings` : `${c.name} is closed for bookings`);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  const remove = useMutation({
    mutationFn: (c: City) => api(`/admin/cities/${c.id}`, { method: 'DELETE' }),
    onSuccess: (_r, c) => {
      toast.success(`${c.name} deleted`);
      setDeleting(null);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  return (
    <div>
      <PageHeader
        title="Cities"
        subtitle="Only active cities appear in the city picker on the site."
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New city
          </Button>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading cities" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No cities yet" />
        ) : (
          <TableWrap>
            <table className="table min-w-[560px]">
              <thead>
                <tr>
                  <th>City</th>
                  <th>State</th>
                  <th>Professionals</th>
                  <th>Open for bookings</th>
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} data-testid="city-row" data-slug={c.slug}>
                    <td>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-mute">{c.slug}</p>
                    </td>
                    <td>{c.state || '—'}</td>
                    <td>{c.professionals ?? 0}</td>
                    <td>
                      <Switch
                        checked={c.isActive}
                        label={`${c.name} active`}
                        text={c.isActive ? 'Active' : 'Off'}
                        onChange={(next) => toggle.mutate({ city: c, isActive: next })}
                      />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label={`Delete ${c.name}`} onClick={() => setDeleting(c)} className="hover:text-bad">
                          <Trash2 className="size-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>

      <CityForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        city={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(c, isNew) => {
          toast.success(isNew ? `${c.name} added` : `${c.name} saved`);
          qc.invalidateQueries({ queryKey: KEY });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this city?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be removed. Cities with professionals or bookings can’t be deleted; switch them off instead.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => {
          remove.reset();
          setDeleting(null);
        }}
      />
    </div>
  );
}

function CityForm({ open, city, onClose, onSaved }: { open: boolean; city: City | null; onClose: () => void; onSaved: (c: City, isNew: boolean) => void }) {
  const [name, setName] = useState(city?.name || '');
  const [state, setState] = useState(city?.state || '');
  const [sortOrder, setSortOrder] = useState(String(city?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(city?.isActive ?? true);
  const [nameError, setNameError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      city
        ? api<{ city: City }>(`/admin/cities/${city.id}`, { method: 'PATCH', body }).then((r) => r.city)
        : api<{ city: City }>('/admin/cities', { method: 'POST', body }).then((r) => r.city),
    onSuccess: (c) => onSaved(c, !city),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError('Enter a city name');
      return;
    }
    setNameError(null);
    mutation.mutate({ name: name.trim(), state: state.trim(), sortOrder: Number(sortOrder) || 0, isActive });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={city ? 'Edit city' : 'New city'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="city-form" busy={mutation.isPending}>
            Save city
          </Button>
        </>
      }
    >
      <form id="city-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="City name" id="city-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} error={nameError} />
        <TextField label="State" id="city-state" value={state} maxLength={60} onChange={(e) => setState(e.target.value)} />
        <TextField label="Sort order" id="city-sort" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d-]/g, ''))} />
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <span className="text-sm font-medium">Open for bookings</span>
          <Switch checked={isActive} onChange={setIsActive} label="City active" />
        </div>
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Modal>
  );
}
