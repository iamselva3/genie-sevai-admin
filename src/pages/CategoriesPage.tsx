import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog, Drawer } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorBox, IconButton, PageHeader, Spinner, Switch, TextAreaField, TextField } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { CategoryIcon, ICON_KEYS } from '../lib/icons';
import { useCategories } from '../lib/lookups';
import type { Category } from '../lib/types';

const KEY = ['admin', 'categories'];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useCategories();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { category: Category; isActive: boolean }) =>
      api<{ category: Category }>(`/admin/categories/${v.category.id}`, { method: 'PATCH', body: { isActive: v.isActive } }).then((r) => r.category),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Category[]>(KEY);
      qc.setQueryData<Category[]>(KEY, (list) => list?.map((c) => (c.id === v.category.id ? { ...c, isActive: v.isActive } : c)));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
      toast.error(errorMessage(err));
    },
    onSuccess: (c) => {
      toast.success(c.isActive ? `${c.name} is visible on the site` : `${c.name} is hidden from the site`);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  const remove = useMutation({
    mutationFn: (c: Category) => api(`/admin/categories/${c.id}`, { method: 'DELETE' }),
    onSuccess: (_r, c) => {
      toast.success(`${c.name} deleted`);
      setDeleting(null);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Hidden categories disappear from the site along with all their services."
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New category
          </Button>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      {isLoading ? (
        <Spinner label="Loading categories" />
      ) : !data || data.length === 0 ? (
        <div className="card">
          <EmptyState title="No categories yet" body="Create your first category to start adding services." />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li
              key={c.id}
              data-testid="category-row"
              data-slug={c.slug}
              className={clsx('card flex flex-col gap-4 p-4', !c.isActive && 'bg-paper')}
            >
              <div className="flex items-start gap-3">
                <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', c.isActive ? 'bg-yellow' : 'border border-line bg-white')}>
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold">{c.name}</p>
                  <p className="truncate text-xs text-mute">{c.tagline || c.slug}</p>
                </div>
                <div className="flex gap-1">
                  <IconButton label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${c.name}`} onClick={() => setDeleting(c)} className="hover:text-bad">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <Link to={`/services?category=${c.id}`} className="text-xs text-mute hover:text-ink">
                  <strong className="text-ink">{c.services?.active ?? 0}</strong> live · {c.services?.unavailable ?? 0} unavailable · {c.services?.hidden ?? 0} hidden
                </Link>
                <Switch
                  checked={c.isActive}
                  label="Visible on site"
                  text={c.isActive ? 'Visible' : 'Hidden'}
                  onChange={(next) => toggle.mutate({ category: c, isActive: next })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        category={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(c, isNew) => {
          toast.success(isNew ? `${c.name} created` : `${c.name} saved`);
          qc.invalidateQueries({ queryKey: KEY });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this category?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be removed. Categories that still have services or bookings can’t be deleted; hide them instead.
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

function CategoryForm({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: (c: Category, isNew: boolean) => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [tagline, setTagline] = useState(category?.tagline || '');
  const [description, setDescription] = useState(category?.description || '');
  const [icon, setIcon] = useState(category?.icon || 'wrench');
  const [imageUrl, setImageUrl] = useState(category?.imageUrl || '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [nameError, setNameError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      category
        ? api<{ category: Category }>(`/admin/categories/${category.id}`, { method: 'PATCH', body }).then((r) => r.category)
        : api<{ category: Category }>('/admin/categories', { method: 'POST', body }).then((r) => r.category),
    onSuccess: (c) => onSaved(c, !category),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError('Enter a name');
      return;
    }
    setNameError(null);
    mutation.mutate({
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      icon,
      imageUrl: imageUrl.trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={category ? 'Edit category' : 'New category'}
      description={category?.slug}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" busy={mutation.isPending}>
            Save category
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Name" id="cat-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} error={nameError} />
        <TextField label="Tagline" id="cat-tagline" value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} />
        <TextAreaField label="Description" id="cat-description" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">Icon</legend>
          <div className="grid grid-cols-6 gap-2">
            {ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={icon === key}
                aria-label={key}
                title={key}
                onClick={() => setIcon(key)}
                className={clsx(
                  'grid aspect-square place-items-center rounded-xl border',
                  icon === key ? 'border-ink bg-yellow' : 'border-line bg-white hover:border-ink',
                )}
              >
                <CategoryIcon name={key} className="size-5" />
              </button>
            ))}
          </div>
        </fieldset>
        <TextField label="Image URL" id="cat-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" hint="Optional" />
        <TextField label="Sort order" id="cat-sort" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d-]/g, ''))} />
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <span className="text-sm font-medium">Show this category on the site</span>
          <Switch checked={isActive} onChange={setIsActive} label="Visible on site" />
        </div>
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Drawer>
  );
}
