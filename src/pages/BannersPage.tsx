import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, CalendarRange, Check, ImagePlus, LoaderCircle, MapPin, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { BannerPreview } from '../components/BannerPreview';
import { ConfirmDialog, Drawer } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Button,
  CheckboxField,
  EmptyState,
  ErrorBox,
  IconButton,
  PageHeader,
  Pill,
  SelectField,
  Spinner,
  Switch,
  TextField,
} from '../components/ui';
import { assetUrl, errorMessage, uploadImage } from '../lib/api';
import {
  ACTION_OPTIONS,
  ART_OPTIONS,
  BANNERS_KEY,
  DEFAULT_BACKGROUND,
  SWATCHES,
  actionSummary,
  bannerStatus,
  createBanner,
  deleteBanner,
  isValidLink,
  listBanners,
  normaliseHex,
  reorderBanners,
  suggestTone,
  toDateInput,
  updateBanner,
  type BannerStatusKey,
} from '../lib/banners';
import { dateText } from '../lib/format';
import { checkImageFile, resizeImage } from '../lib/image';
import { useCategories, useCities, useCoupons, useServices } from '../lib/lookups';
import type { Banner, BannerAction, BannerArt, BannerInput, BannerLayout, BannerTextTone } from '../lib/types';

const REORDER_KEY = [...BANNERS_KEY, 'reorder'];

const STATUS_TONE: Record<BannerStatusKey, 'ok' | 'neutral' | 'warn' | 'bad'> = {
  active: 'ok',
  off: 'neutral',
  scheduled: 'warn',
  expired: 'bad',
};

function scheduleText(b: Pick<Banner, 'startsAt' | 'endsAt'>) {
  if (!b.startsAt && !b.endsAt) return 'Always';
  return `${b.startsAt ? dateText(b.startsAt) : 'Now'} – ${b.endsAt ? dateText(b.endsAt) : 'No end'}`;
}

export default function BannersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: cities } = useCities();
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: BANNERS_KEY, queryFn: listBanners });

  const cityNames = useMemo(() => new Map((cities || []).map((c) => [c.id, c.name])), [cities]);
  const citiesText = (ids: string[]) => {
    if (!ids.length) return 'All cities';
    const names = ids.map((id) => cityNames.get(id)).filter((n): n is string => !!n);
    if (names.length === ids.length) return names.join(', ');
    return `${ids.length} cit${ids.length === 1 ? 'y' : 'ies'}`;
  };

  const toggle = useMutation({
    mutationFn: (v: { banner: Banner; isActive: boolean }) => updateBanner(v.banner.id, { isActive: v.isActive }),
    onSuccess: (b) => {
      toast.success(`${b.title} ${b.isActive ? 'turned on' : 'turned off'}`);
      qc.setQueryData<Banner[]>(BANNERS_KEY, (list) => list?.map((x) => (x.id === b.id ? { ...x, ...b } : x)));
      qc.invalidateQueries({ queryKey: BANNERS_KEY });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const reorder = useMutation({
    mutationKey: REORDER_KEY,
    mutationFn: (ids: string[]) => reorderBanners(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: BANNERS_KEY, exact: true });
      const previous = qc.getQueryData<Banner[]>(BANNERS_KEY);
      if (previous) {
        const byId = new Map(previous.map((b) => [b.id, b]));
        qc.setQueryData<Banner[]>(
          BANNERS_KEY,
          ids.map((id) => byId.get(id)).filter((b): b is Banner => !!b).map((b, i) => ({ ...b, sortOrder: i })),
        );
      }
      return { previous };
    },
    onError: (err, _ids, ctx) => {
      if (ctx?.previous) qc.setQueryData(BANNERS_KEY, ctx.previous);
      toast.error(errorMessage(err));
    },
    onSuccess: () => toast.success('Banner order saved'),
    onSettled: () => {
      // Only resync once the last of several quick moves has finished, so rows don't jump back mid-sequence.
      if (qc.isMutating({ mutationKey: REORDER_KEY }) <= 1) qc.invalidateQueries({ queryKey: BANNERS_KEY, exact: true });
    },
  });

  const remove = useMutation({
    mutationFn: (b: Banner) => deleteBanner(b.id),
    onSuccess: (_r, b) => {
      toast.success(`${b.title} deleted`);
      setDeleting(null);
      qc.setQueryData<Banner[]>(BANNERS_KEY, (list) => list?.filter((x) => x.id !== b.id));
      qc.invalidateQueries({ queryKey: BANNERS_KEY, exact: true });
    },
  });

  const move = (index: number, dir: -1 | 1) => {
    if (!data) return;
    const j = index + dir;
    if (j < 0 || j >= data.length) return;
    const ids = data.map((b) => b.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate(ids);
  };

  const nextSortOrder = data && data.length ? Math.max(...data.map((b) => b.sortOrder || 0)) + 1 : 0;

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Offer banners on the customer home page, shown in this order."
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New banner
          </Button>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading banners" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No banners yet" body="Add a banner to promote an offer, a service or a coupon on the customer home page." />
        ) : (
          <ul aria-label="Banners" className="divide-y divide-line">
            {data.map((b, i) => {
              const status = bannerStatus(b);
              return (
                <li
                  key={b.id}
                  data-testid="banner-row"
                  data-id={b.id}
                  data-title={b.title}
                  className="flex flex-col gap-4 p-4 md:flex-row md:items-center"
                >
                  <div className="w-full shrink-0 sm:max-w-[320px] md:w-[240px]">
                    <BannerPreview banner={b} size="sm" decorative />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-mute tabular-nums">#{i + 1}</span>
                      <p className="min-w-0 truncate font-semibold" data-testid="banner-title">
                        {b.title}
                      </p>
                      <span data-testid="banner-status" data-status={status.key}>
                        <Pill tone={STATUS_TONE[status.key]}>{status.label}</Pill>
                      </span>
                      <Pill>{b.layout === 'image' ? 'Full image' : 'Split'}</Pill>
                    </div>
                    <ul className="mt-1.5 flex flex-col gap-1 text-xs text-mute">
                      <li className="flex items-center gap-1.5" data-testid="banner-action">
                        <MousePointerClick className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{actionSummary(b)}</span>
                      </li>
                      <li className="flex items-center gap-1.5" data-testid="banner-cities">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{citiesText(b.cities || [])}</span>
                      </li>
                      <li className="flex items-center gap-1.5" data-testid="banner-schedule">
                        <CalendarRange className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{scheduleText(b)}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <Switch
                      checked={b.isActive}
                      label={`${b.title} active`}
                      busy={toggle.isPending && toggle.variables?.banner.id === b.id}
                      onChange={(v) => toggle.mutate({ banner: b, isActive: v })}
                    />
                    <div className="flex gap-1">
                      <IconButton label={`Move ${b.title} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Move ${b.title} down`} disabled={i === data.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Edit ${b.title}`} onClick={() => setEditing(b)}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Delete ${b.title}`} onClick={() => setDeleting(b)} className="hover:text-bad">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BannerForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        banner={editing === 'new' ? null : editing}
        nextSortOrder={nextSortOrder}
        onClose={() => setEditing(null)}
        onSaved={(b, isNew) => {
          toast.success(isNew ? `${b.title} created` : `${b.title} saved`);
          qc.invalidateQueries({ queryKey: BANNERS_KEY, exact: true });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this banner?"
        message={
          <>
            <strong>{deleting?.title}</strong> will be removed from the customer home page right away. This can’t be undone.
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

/* ---------------- Form ---------------- */

interface Draft {
  layout: BannerLayout;
  imageUrl: string;
  art: BannerArt;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Last valid colour (drives the preview). */
  background: string;
  /** What is typed in the hex field (may be mid-edit). */
  hex: string;
  textTone: BannerTextTone;
  action: BannerAction;
  target: string;
  cities: string[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

type DraftErrors = Partial<Record<'title' | 'image' | 'hex' | 'target' | 'endsAt', string>>;

function toDraft(b: Banner | null): Draft {
  const bg = normaliseHex(b?.background || '') || DEFAULT_BACKGROUND;
  return {
    layout: b?.layout || 'split',
    imageUrl: b?.imageUrl || '',
    art: b?.art || '',
    eyebrow: b?.eyebrow || '',
    title: b?.title || '',
    subtitle: b?.subtitle || '',
    ctaLabel: b?.ctaLabel ?? 'Book now',
    background: bg,
    hex: bg,
    textTone: b?.textTone || suggestTone(bg),
    action: b?.action || 'service',
    target: b?.target || '',
    cities: b?.cities || [],
    startsAt: toDateInput(b?.startsAt),
    endsAt: toDateInput(b?.endsAt),
    isActive: b?.isActive ?? true,
  };
}

const TARGET_REQUIRED: Record<Exclude<BannerAction, 'none'>, string> = {
  service: 'Choose a service',
  category: 'Choose a category',
  coupon: 'Choose a coupon',
  link: 'Enter a link',
};

type UploadState = { phase: 'resizing' } | { phase: 'uploading'; progress: number } | null;

/** Two-option radio group styled as a segmented control. */
function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  const base = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-paper p-1">
        {options.map((o) => {
          const on = value === o.value;
          const descId = o.description ? `${base}-${o.value}` : undefined;
          return (
            <label
              key={o.value}
              className={clsx(
                'flex cursor-pointer flex-col rounded-lg px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                on ? 'bg-ink text-white' : 'text-ink hover:bg-black/5',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                aria-label={o.label}
                aria-describedby={descId}
                className="sr-only"
              />
              <span className="font-semibold">{o.label}</span>
              {o.description && (
                <span id={descId} className={clsx('text-xs', on ? 'text-white/70' : 'text-mute')}>
                  {o.description}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-mute">{hint}</p>}
    </fieldset>
  );
}

function BannerForm({
  open,
  banner,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  banner: Banner | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (b: Banner, isNew: boolean) => void;
}) {
  // The parent remounts this form (via `key`) each time it opens, so initial state is always fresh.
  const [draft, setDraft] = useState<Draft>(() => toDraft(banner));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [serviceQuery, setServiceQuery] = useState('');
  const [upload, setUpload] = useState<UploadState>(null);
  const [photoError, setPhotoError] = useState('');
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: categories } = useCategories();
  const services = useServices(open && draft.action === 'service');
  const coupons = useCoupons(open && draft.action === 'coupon');

  useEffect(() => () => abortRef.current?.abort(), []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const clearError = (key: keyof DraftErrors) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const split = draft.layout === 'split';

  const mutation = useMutation({
    mutationFn: (body: Partial<BannerInput> & { title: string }) => (banner ? updateBanner(banner.id, body) : createBanner(body)),
    onSuccess: (b) => onSaved(b, !banner),
  });

  /* ----- photo ----- */

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    clearError('image');
    try {
      checkImageFile(file);
    } catch (err) {
      setPhotoError(errorMessage(err));
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setUpload({ phase: 'resizing' });
    try {
      const blob = await resizeImage(file);
      if (ctrl.signal.aborted) return;
      setUpload({ phase: 'uploading', progress: 0 });
      const { url } = await uploadImage(blob, {
        signal: ctrl.signal,
        onProgress: (p) => setUpload({ phase: 'uploading', progress: p }),
      });
      if (!ctrl.signal.aborted) set('imageUrl', url);
    } catch (err) {
      if (!ctrl.signal.aborted) setPhotoError(errorMessage(err, 'Upload failed. Try again.'));
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setUpload(null);
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (upload) return;
    void handleFile(e.dataTransfer.files?.[0]);
  };

  /* ----- colour ----- */

  const pickColour = (value: string) => {
    const hex = normaliseHex(value);
    if (!hex) return;
    clearError('hex');
    setDraft((d) => ({ ...d, background: hex, hex, textTone: suggestTone(hex) }));
  };

  const typeHex = (value: string) => {
    const raw = value.toUpperCase().replace(/[^#0-9A-F]/g, '');
    const hex = normaliseHex(raw);
    clearError('hex');
    setDraft((d) => ({
      ...d,
      hex: raw,
      ...(hex && hex !== d.background ? { background: hex, textTone: suggestTone(hex) } : {}),
    }));
  };

  /* ----- target options ----- */

  const serviceOptions = useMemo(() => {
    const list = [...(services.data || [])].sort(
      (a, b) => (a.category?.name || '').localeCompare(b.category?.name || '') || a.name.localeCompare(b.name),
    );
    const needle = serviceQuery.trim().toLowerCase();
    const opts = list
      .filter(
        (s) =>
          !needle ||
          s.slug === draft.target ||
          s.name.toLowerCase().includes(needle) ||
          s.slug.includes(needle) ||
          (s.category?.name || '').toLowerCase().includes(needle),
      )
      .map((s) => ({
        value: s.slug,
        label: `${s.name} · ${s.category?.name || 'No category'}${s.status !== 'active' ? ` (${s.status})` : ''}`,
      }));
    if (draft.action === 'service' && draft.target && !list.some((s) => s.slug === draft.target)) {
      opts.unshift({ value: draft.target, label: services.data ? `${draft.target} (not found)` : draft.target });
    }
    return opts;
  }, [services.data, serviceQuery, draft.target, draft.action]);

  const categoryOptions = useMemo(() => {
    const list = [...(categories || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const opts = list.map((c) => ({ value: c.slug, label: `${c.name}${c.isActive ? '' : ' (hidden)'}` }));
    if (draft.action === 'category' && draft.target && !list.some((c) => c.slug === draft.target)) {
      opts.unshift({ value: draft.target, label: categories ? `${draft.target} (not found)` : draft.target });
    }
    return opts;
  }, [categories, draft.target, draft.action]);

  const couponOptions = useMemo(() => {
    const list = coupons.data || [];
    const opts = list.map((c) => ({
      value: c.code,
      label: `${c.code}${c.description ? ` — ${c.description}` : ''}${c.isActive ? '' : ' (paused)'}`,
    }));
    if (draft.action === 'coupon' && draft.target && !list.some((c) => c.code === draft.target)) {
      opts.unshift({ value: draft.target, label: coupons.data ? `${draft.target} (not found)` : draft.target });
    }
    return opts;
  }, [coupons.data, draft.target, draft.action]);

  const cityList = (cities || []).filter((c) => c.isActive || draft.cities.includes(c.id));

  /* ----- submit ----- */

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (upload) return;
    const next: DraftErrors = {};
    const title = draft.title.trim();
    const target = draft.target.trim();
    const background = normaliseHex(draft.hex);
    if (title.length < 2 || title.length > 80) next.title = 'Enter a title of 2–80 characters';
    if (draft.layout === 'image' && !draft.imageUrl) next.image = 'Upload the banner artwork for a full-image banner';
    if (!background) next.hex = 'Use a 6-digit colour like #D7F0EA';
    if (draft.action !== 'none' && !target) next.target = TARGET_REQUIRED[draft.action];
    else if (draft.action === 'link' && !isValidLink(target)) next.target = 'Use a site path like /explore or a full https:// link';
    if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) next.endsAt = 'End date is before the start date';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      title,
      subtitle: draft.subtitle.trim(),
      eyebrow: draft.eyebrow.trim(),
      ctaLabel: draft.ctaLabel.trim() || 'Book now',
      imageUrl: draft.imageUrl,
      layout: draft.layout,
      background: background || DEFAULT_BACKGROUND,
      textTone: draft.textTone,
      art: draft.art,
      action: draft.action,
      target: draft.action === 'none' ? '' : target,
      cities: draft.cities,
      isActive: draft.isActive,
      startsAt: draft.startsAt ? `${draft.startsAt}T00:00:00+05:30` : null,
      endsAt: draft.endsAt ? `${draft.endsAt}T23:59:59+05:30` : null,
      ...(banner ? {} : { sortOrder: nextSortOrder }),
    });
  };

  const progress = upload?.phase === 'uploading' ? Math.round(upload.progress * 100) : 0;
  const photoMessage = photoError || errors.image;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={banner ? 'Edit banner' : 'New banner'}
      description="Shown on the customer home page."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="banner-form" busy={mutation.isPending} disabled={!!upload}>
            Save banner
          </Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* Live preview (sticks to the top on roomy screens so it stays visible while editing) */}
        <div className="top-0 z-10 -mx-5 -mt-5 border-b border-line bg-white px-5 pt-4 pb-4 [@media(min-width:640px)_and_(min-height:760px)]:sticky">
          <p id="banner-preview-label" className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">
            Live preview
          </p>
          <div role="group" aria-labelledby="banner-preview-label">
            <BannerPreview
              testId="banner-live-preview"
              banner={{
                ...draft,
                title: draft.title.trim(),
                eyebrow: draft.eyebrow.trim(),
                subtitle: draft.subtitle.trim(),
                ctaLabel: draft.ctaLabel.trim() || 'Book now',
              }}
            />
          </div>
        </div>

        <Segmented<BannerLayout>
          legend="Layout"
          name="banner-layout"
          value={draft.layout}
          onChange={(v) => {
            set('layout', v);
            clearError('image');
          }}
          options={[
            { value: 'split', label: 'Split', description: 'Colour and text on the left, picture on the right' },
            { value: 'image', label: 'Full image', description: 'Your artwork fills the whole banner' },
          ]}
        />

        {/* Photo */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-semibold">Photo</legend>
          <div
            data-testid="banner-photo-drop"
            data-state={upload ? upload.phase : draft.imageUrl ? 'done' : 'empty'}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = upload ? 'none' : 'copy';
              if (!dragging) setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={clsx(
              'rounded-xl border-2 border-dashed p-3 transition-colors has-[input:focus-visible]:border-ink has-[input:focus-visible]:bg-yellow-soft',
              dragging ? 'border-ink bg-yellow-soft' : photoMessage ? 'border-bad/50 bg-paper' : 'border-line bg-paper',
            )}
          >
            <input
              id="banner-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              aria-label="Banner photo"
              aria-describedby="banner-photo-hint"
              disabled={!!upload}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void handleFile(file);
              }}
            />
            {upload ? (
              <div className="flex flex-wrap items-center gap-3 py-2">
                <LoaderCircle className="size-5 shrink-0 animate-[spin_0.8s_linear_infinite]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p role="status" className="text-sm font-semibold">
                    {upload.phase === 'resizing' ? 'Resizing photo…' : 'Uploading photo…'}
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={upload.phase === 'uploading' ? progress : undefined}
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
                  >
                    <div
                      className={clsx('h-full bg-ink transition-[width]', upload.phase === 'resizing' && 'w-1/5 animate-pulse')}
                      style={upload.phase === 'uploading' ? { width: `${Math.max(4, progress)}%` } : undefined}
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => abortRef.current?.abort()}>
                  Cancel upload
                </Button>
              </div>
            ) : draft.imageUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <img
                  src={assetUrl(draft.imageUrl)}
                  alt=""
                  data-testid="banner-photo-thumb"
                  className="h-16 w-28 shrink-0 rounded-lg border border-line bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Photo added</p>
                  <p className="truncate text-xs text-mute">{draft.imageUrl}</p>
                </div>
                <div className="flex gap-2">
                  <label
                    htmlFor="banner-photo"
                    className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:border-ink"
                  >
                    Replace
                  </label>
                  <Button size="sm" variant="outline" aria-label="Remove photo" onClick={() => set('imageUrl', '')}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="banner-photo" className="flex cursor-pointer flex-col items-center gap-1 py-5 text-center">
                <ImagePlus className="size-6 text-mute" aria-hidden="true" />
                <span className="text-sm font-semibold">Choose a photo</span>
                <span className="text-xs text-mute">or drag and drop it here · PNG, JPG, WebP or AVIF, up to 10 MB</span>
              </label>
            )}
          </div>
          {photoMessage ? (
            <p role="alert" className="text-xs font-medium text-bad">
              {photoMessage}
            </p>
          ) : null}
          <p id="banner-photo-hint" className="text-xs text-mute">
            Wide images work best (about 1600×600). Large photos are resized automatically.
            {!split && ' For a full-image banner, put the offer text in the artwork itself.'}
          </p>
        </fieldset>

        {split && (
          <SelectField
            label="Built-in illustration"
            id="banner-art"
            value={draft.art}
            onChange={(e) => set('art', e.target.value as BannerArt)}
            options={ART_OPTIONS}
            disabled={!!draft.imageUrl}
            hint={draft.imageUrl ? 'Not used while a photo is set.' : 'Shown on the right when there is no photo.'}
          />
        )}

        {/* Text */}
        {split && (
          <TextField
            label="Eyebrow"
            id="banner-eyebrow"
            value={draft.eyebrow}
            maxLength={40}
            onChange={(e) => set('eyebrow', e.target.value)}
            hint="Small label above the title, e.g. Bathroom deep clean"
          />
        )}
        <TextField
          label="Title"
          id="banner-title"
          value={draft.title}
          maxLength={80}
          onChange={(e) => {
            set('title', e.target.value);
            clearError('title');
          }}
          error={errors.title}
          hint={split ? undefined : 'Not shown on the banner. Screen readers read it as the picture’s description.'}
        />
        {split && (
          <TextField
            label="Subtitle"
            id="banner-subtitle"
            value={draft.subtitle}
            maxLength={160}
            onChange={(e) => set('subtitle', e.target.value)}
          />
        )}
        {split && draft.action !== 'none' && (
          <TextField
            label="Button label"
            id="banner-cta"
            value={draft.ctaLabel}
            maxLength={24}
            onChange={(e) => set('ctaLabel', e.target.value)}
            hint="Empty = Book now"
          />
        )}

        {/* Colour */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Background colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((s) => {
              const on = draft.background === s.hex;
              return (
                <button
                  key={s.hex}
                  type="button"
                  aria-label={s.name}
                  aria-pressed={on}
                  title={`${s.name} ${s.hex}`}
                  onClick={() => pickColour(s.hex)}
                  className={clsx(
                    'grid size-8 place-items-center rounded-full border transition-shadow',
                    on ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-black/15 hover:border-ink',
                  )}
                  style={{ backgroundColor: s.hex }}
                >
                  {on && <Check className="size-4" style={{ color: suggestTone(s.hex) === 'dark' ? '#111111' : '#FFFFFF' }} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex items-start gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="banner-colour" className="text-[13px] font-semibold">
                Custom
              </label>
              <input
                id="banner-colour"
                type="color"
                aria-label="Custom colour"
                value={draft.background.toLowerCase()}
                onChange={(e) => pickColour(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-[0.625rem] border border-line bg-white p-1"
              />
            </div>
            <TextField
              label="Hex code"
              id="banner-hex"
              value={draft.hex}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => typeHex(e.target.value)}
              onBlur={() => {
                const hex = normaliseHex(draft.hex);
                if (hex && hex !== draft.hex) set('hex', hex);
              }}
              error={errors.hex}
              className="w-36"
            />
          </div>
          {!split && <p className="text-xs text-mute">Fills the banner while the picture loads.</p>}
        </fieldset>

        {split && (
          <Segmented<BannerTextTone>
            legend="Text tone"
            name="banner-tone"
            value={draft.textTone}
            onChange={(v) => set('textTone', v)}
            options={[
              { value: 'dark', label: 'Dark', description: 'For light backgrounds' },
              { value: 'light', label: 'Light', description: 'For dark backgrounds' },
            ]}
            hint="Suggested from the background colour. Change it if the text is hard to read."
          />
        )}

        {/* Action */}
        <SelectField
          label="Action"
          id="banner-action"
          value={draft.action}
          onChange={(e) => {
            setDraft((d) => ({ ...d, action: e.target.value as BannerAction, target: '' }));
            setServiceQuery('');
            clearError('target');
          }}
          options={ACTION_OPTIONS}
          hint={draft.action === 'none' ? 'The banner will not be clickable.' : 'What happens when a customer taps the banner.'}
        />
        {draft.action === 'service' && (
          <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3">
            <TextField
              label="Search services"
              id="banner-service-search"
              type="search"
              value={serviceQuery}
              placeholder="Type a name or category"
              onChange={(e) => setServiceQuery(e.target.value)}
            />
            <SelectField
              label="Service"
              id="banner-target-service"
              value={draft.target}
              onChange={(e) => {
                set('target', e.target.value);
                clearError('target');
              }}
              placeholder={services.isLoading ? 'Loading services…' : 'Choose a service'}
              options={serviceOptions}
              error={errors.target}
              hint={
                services.error
                  ? errorMessage(services.error)
                  : serviceQuery.trim() && serviceOptions.length === 0
                    ? `No services match “${serviceQuery.trim()}”`
                    : undefined
              }
            />
          </div>
        )}
        {draft.action === 'category' && (
          <SelectField
            label="Category"
            id="banner-target-category"
            value={draft.target}
            onChange={(e) => {
              set('target', e.target.value);
              clearError('target');
            }}
            placeholder="Choose a category"
            options={categoryOptions}
            error={errors.target}
          />
        )}
        {draft.action === 'coupon' && (
          <SelectField
            label="Coupon"
            id="banner-target-coupon"
            value={draft.target}
            onChange={(e) => {
              set('target', e.target.value);
              clearError('target');
            }}
            placeholder={coupons.isLoading ? 'Loading coupons…' : 'Choose a coupon'}
            options={couponOptions}
            error={errors.target}
            hint={coupons.error ? errorMessage(coupons.error) : undefined}
          />
        )}
        {draft.action === 'link' && (
          <TextField
            label="Link"
            id="banner-target-link"
            value={draft.target}
            maxLength={300}
            spellCheck={false}
            autoComplete="off"
            placeholder="/explore or https://…"
            onChange={(e) => {
              set('target', e.target.value);
              clearError('target');
            }}
            error={errors.target}
            hint="A page on this site (/path) or a full https:// address"
          />
        )}

        {/* Cities */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Cities</legend>
          <p className="text-xs text-mute">
            {draft.cities.length === 0
              ? 'Shown in all cities. Tick cities to limit it.'
              : `Only in ${draft.cities.length} selected cit${draft.cities.length === 1 ? 'y' : 'ies'}.`}
          </p>
          {citiesLoading ? (
            <p className="text-xs text-mute">Loading cities…</p>
          ) : cityList.length ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-line px-4 py-3 sm:grid-cols-3">
              {cityList.map((c) => (
                <CheckboxField
                  key={c.id}
                  label={c.name}
                  checked={draft.cities.includes(c.id)}
                  onChange={(on) => set('cities', on ? [...draft.cities, c.id] : draft.cities.filter((x) => x !== c.id))}
                />
              ))}
            </div>
          ) : null}
          {draft.cities.length > 0 && (
            <button type="button" onClick={() => set('cities', [])} className="self-start text-[13px] font-semibold underline">
              Show in all cities
            </button>
          )}
        </fieldset>

        {/* Schedule */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Schedule</legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start date" id="banner-start" type="date" value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} hint="Optional" />
            <TextField
              label="End date"
              id="banner-end"
              type="date"
              value={draft.endsAt}
              min={draft.startsAt || undefined}
              onChange={(e) => {
                set('endsAt', e.target.value);
                clearError('endsAt');
              }}
              error={errors.endsAt}
              hint="Optional"
            />
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3">
          <CheckboxField label="Active" checked={draft.isActive} onChange={(v) => set('isActive', v)} />
        </div>
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Drawer>
  );
}
