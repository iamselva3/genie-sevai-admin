import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
  TableWrap,
  TextField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateText, inr } from '../lib/format';
import type { Coupon } from '../lib/types';

const KEY = ['admin', 'coupons'];

function describe(c: Coupon) {
  const off = c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (up to ${inr(c.maxDiscount)})` : ''}` : `${inr(c.value)} off`;
  return c.minOrder ? `${off} above ${inr(c.minOrder)}` : off;
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => api<{ coupons: Coupon[] }>('/admin/coupons').then((r) => r.coupons),
  });

  const toggle = useMutation({
    mutationFn: (v: { coupon: Coupon; isActive: boolean }) =>
      api<{ coupon: Coupon }>(`/admin/coupons/${v.coupon.id}`, { method: 'PATCH', body: { isActive: v.isActive } }).then((r) => r.coupon),
    onSuccess: (c) => {
      toast.success(`${c.code} ${c.isActive ? 'activated' : 'paused'}`);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (c: Coupon) => api(`/admin/coupons/${c.id}`, { method: 'DELETE' }),
    onSuccess: (_r, c) => {
      toast.success(`${c.code} deleted`);
      setDeleting(null);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Public coupons are listed in the customer’s cart."
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New coupon
          </Button>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading coupons" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No coupons" />
        ) : (
          <TableWrap>
            <table className="table min-w-[760px]">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Offer</th>
                  <th>Used</th>
                  <th>Valid</th>
                  <th>Active</th>
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} data-testid="coupon-row" data-code={c.code}>
                    <td>
                      <span className="rounded-md border border-dashed border-ink px-2 py-0.5 font-mono text-sm font-bold">{c.code}</span>
                      {!c.isPublic && (
                        <span className="ml-2">
                          <Pill>Private</Pill>
                        </span>
                      )}
                    </td>
                    <td>
                      <p className="font-medium">{describe(c)}</p>
                      {c.description && <p className="max-w-[260px] truncate text-xs text-mute">{c.description}</p>}
                    </td>
                    <td className="text-xs">
                      <strong className="text-sm">{c.usedCount}</strong>
                      {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      <p className="text-mute">{c.perCustomerLimit ? `${c.perCustomerLimit} per customer` : 'No per-customer limit'}</p>
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      {c.validFrom || c.validTo ? `${c.validFrom ? dateText(c.validFrom) : 'Now'} – ${c.validTo ? dateText(c.validTo) : 'No end'}` : 'Always'}
                    </td>
                    <td>
                      <Switch checked={c.isActive} label={`${c.code} active`} onChange={(v) => toggle.mutate({ coupon: c, isActive: v })} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Edit ${c.code}`} onClick={() => setEditing(c)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label={`Delete ${c.code}`} onClick={() => setDeleting(c)} className="hover:text-bad">
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

      <CouponForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        coupon={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(c, isNew) => {
          toast.success(isNew ? `${c.code} created` : `${c.code} saved`);
          qc.invalidateQueries({ queryKey: KEY });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this coupon?"
        message={
          <>
            <strong>{deleting?.code}</strong> will stop working immediately. Bookings that already used it keep their discount.
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

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

function CouponForm({ open, coupon, onClose, onSaved }: { open: boolean; coupon: Coupon | null; onClose: () => void; onSaved: (c: Coupon, isNew: boolean) => void }) {
  const [code, setCode] = useState(coupon?.code || '');
  const [description, setDescription] = useState(coupon?.description || '');
  const [type, setType] = useState<'percent' | 'flat'>(coupon?.type || 'flat');
  const [value, setValue] = useState(coupon ? String(coupon.value) : '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount ? String(coupon.maxDiscount) : '');
  const [minOrder, setMinOrder] = useState(coupon?.minOrder ? String(coupon.minOrder) : '');
  const [validFrom, setValidFrom] = useState(toDateInput(coupon?.validFrom ?? null));
  const [validTo, setValidTo] = useState(toDateInput(coupon?.validTo ?? null));
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit ? String(coupon.usageLimit) : '');
  const [perCustomer, setPerCustomer] = useState(String(coupon?.perCustomerLimit ?? 1));
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(coupon?.isPublic ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      coupon
        ? api<{ coupon: Coupon }>(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body }).then((r) => r.coupon)
        : api<{ coupon: Coupon }>('/admin/coupons', { method: 'POST', body }).then((r) => r.coupon),
    onSuccess: (c) => onSaved(c, !coupon),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const v = Number(value);
    if (!/^[A-Z0-9]{3,20}$/.test(code.trim().toUpperCase())) next.code = 'Use 3–20 letters or numbers';
    if (!Number.isInteger(v) || v < 1) next.value = 'Enter a whole number';
    else if (type === 'percent' && v > 100) next.value = 'A percent coupon cannot exceed 100%';
    if (validFrom && validTo && validTo < validFrom) next.validTo = 'End date is before the start date';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      type,
      value: v,
      maxDiscount: type === 'percent' ? Number(maxDiscount) || 0 : 0,
      minOrder: Number(minOrder) || 0,
      validFrom: validFrom ? `${validFrom}T00:00:00+05:30` : null,
      validTo: validTo ? `${validTo}T23:59:59+05:30` : null,
      usageLimit: Number(usageLimit) || 0,
      perCustomerLimit: Number(perCustomer) || 0,
      isActive,
      isPublic,
    });
  };

  const digits = (s: string) => s.replace(/\D/g, '');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="coupon-form" busy={mutation.isPending}>
            Save coupon
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Code" id="coupon-code" value={code} maxLength={20} onChange={(e) => setCode(e.target.value.toUpperCase())} error={errors.code} />
        <TextField label="Description" id="coupon-description" value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} hint="Shown in the cart" />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Type"
            id="coupon-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'percent' | 'flat')}
            options={[
              { value: 'flat', label: 'Flat ₹ off' },
              { value: 'percent', label: 'Percent off' },
            ]}
          />
          <TextField label={type === 'percent' ? 'Value (%)' : 'Value (₹)'} id="coupon-value" inputMode="numeric" value={value} onChange={(e) => setValue(digits(e.target.value))} error={errors.value} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {type === 'percent' && (
            <TextField label="Max discount (₹)" id="coupon-max" inputMode="numeric" value={maxDiscount} onChange={(e) => setMaxDiscount(digits(e.target.value))} hint="Empty = no cap" />
          )}
          <TextField label="Minimum order (₹)" id="coupon-min" inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(digits(e.target.value))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Valid from" id="coupon-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          <TextField label="Valid to" id="coupon-to" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} error={errors.validTo} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Total uses" id="coupon-limit" inputMode="numeric" value={usageLimit} onChange={(e) => setUsageLimit(digits(e.target.value))} hint="Empty = unlimited" />
          <TextField label="Uses per customer" id="coupon-per" inputMode="numeric" value={perCustomer} onChange={(e) => setPerCustomer(digits(e.target.value))} hint="0 = unlimited" />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3">
          <CheckboxField label="Active" checked={isActive} onChange={setIsActive} />
          <CheckboxField label="Show in the cart (public)" checked={isPublic} onChange={setIsPublic} />
        </div>
        {coupon && <p className="text-xs text-mute">Used {coupon.usedCount} times so far.</p>}
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Drawer>
  );
}
