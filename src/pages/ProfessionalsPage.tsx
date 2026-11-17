import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/Modal';
import { ProfessionalForm } from '../components/ProfessionalForm';
import { useToast } from '../components/Toast';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorBox,
  IconButton,
  PageHeader,
  Pill,
  SelectField,
  Spinner,
  Stars,
  TableWrap,
  TextField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { refName } from '../lib/format';
import { asOptions, useCategories, useCities } from '../lib/lookups';
import type { Professional } from '../lib/types';
import { useDebounced } from '../lib/useDebounced';

export default function ProfessionalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const [city, setCity] = useState('');
  const [skill, setSkill] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Professional | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Professional | null>(null);

  const debouncedQ = useDebounced(q.trim());
  const filters = { city, skill, status, q: debouncedQ };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'professionals', filters],
    queryFn: () => api<{ professionals: Professional[] }>('/admin/professionals', { query: filters }).then((r) => r.professionals),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (p: Professional) => api(`/admin/professionals/${p.id}`, { method: 'DELETE' }),
    onSuccess: (_r, p) => {
      toast.success(`${p.name} deleted`);
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin', 'professionals'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Professionals"
        subtitle={data ? `${data.length} professional${data.length === 1 ? '' : 's'}` : 'Your service team'}
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New professional
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <TextField label="Search" id="pro-search" placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          <Search className="pointer-events-none absolute right-3 bottom-3 size-4 text-mute" aria-hidden="true" />
        </div>
        <SelectField label="City" id="pro-filter-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="All cities" options={asOptions(cities)} />
        <SelectField label="Skill" id="pro-filter-skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="All skills" options={asOptions(categories)} />
        <SelectField
          label="Status"
          id="pro-filter-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Any status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading professionals" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No professionals" body="Nobody matches these filters." />
        ) : (
          <TableWrap>
            <table className="table min-w-[820px]">
              <thead>
                <tr>
                  <th>Professional</th>
                  <th>City</th>
                  <th>Skills</th>
                  <th>Rating</th>
                  <th>Jobs</th>
                  <th>Status</th>
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} data-testid="pro-row" data-phone={p.phone}>
                    <td>
                      <Link to={`/professionals/${p.id}`} className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <span>
                          <span className="block font-semibold hover:underline">{p.name}</span>
                          <span className="block text-xs text-mute">{p.phone}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{refName(p.city)}</td>
                    <td className="max-w-[220px]">
                      <span className="line-clamp-2 text-xs">{p.skills.map((s) => refName(s)).join(', ')}</span>
                    </td>
                    <td>
                      <Stars value={p.rating} />
                      <span className="ml-1 text-xs text-mute">({p.ratingCount})</span>
                    </td>
                    <td className="text-xs">
                      <p>
                        <strong className="text-sm">{p.activeJobs ?? 0}</strong> active
                      </p>
                      <p className="text-mute">{p.jobsCompleted} done</p>
                    </td>
                    <td>{p.status === 'active' ? <Pill tone="ok">Active</Pill> : <Pill>Inactive</Pill>}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label={`Delete ${p.name}`} onClick={() => setDeleting(p)} className="hover:text-bad">
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

      <ProfessionalForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        professional={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(p, isNew) => {
          toast.success(isNew ? `${p.name} added to the team` : `${p.name} saved`);
          qc.invalidateQueries({ queryKey: ['admin', 'professionals'] });
          qc.invalidateQueries({ queryKey: ['admin', 'professional', p.id] });
          qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this professional?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be removed. Professionals with booking history can’t be deleted; mark them inactive instead.
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
