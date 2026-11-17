import clsx from 'clsx';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import type { BookingStatus, ServiceStatus } from '../lib/types';
import { STATUS_LABEL } from '../lib/format';

/* ---------------- Buttons ---------------- */

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  busy?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft border border-ink',
  accent: 'bg-yellow text-ink hover:bg-yellow-deep border border-yellow-deep',
  outline: 'bg-white text-ink border border-line hover:border-ink',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-black/5',
  danger: 'bg-bad text-white border border-bad hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', busy, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {busy ? <LoaderCircle className="size-4 animate-[spin_0.8s_linear_infinite]" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-8 items-center justify-center rounded-lg text-ink hover:bg-black/5 disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Form fields ---------------- */

interface FieldShell {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
}

function Shell({ id, label, error, hint, className, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-bad">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, FieldShell & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} className={className}>
      <input
        ref={ref}
        id={fieldId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
    </Shell>
  );
});

export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  options,
  placeholder,
  ...rest
}: FieldShell &
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} className={className}>
      <select id={fieldId} className="input pr-8" aria-invalid={error ? true : undefined} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} className={className}>
      <textarea id={fieldId} className="input min-h-[88px] resize-y" aria-invalid={error ? true : undefined} {...rest} />
    </Shell>
  );
}

/** Accessible on/off switch. `label` is the accessible name; `text` is optional visible text beside it. */
export function Switch({
  checked,
  onChange,
  label,
  text,
  disabled,
  busy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  text?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled || busy}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
          checked ? 'border-ink bg-ink' : 'border-line bg-[#e9e7e0]',
        )}
      >
        <span
          className={clsx(
            'inline-block size-[18px] rounded-full transition-transform',
            checked ? 'translate-x-[22px] bg-yellow' : 'translate-x-[2px] bg-white shadow-sm',
          )}
        />
      </button>
      {text && (
        <span className="text-[13px] font-medium text-ink" aria-hidden="true">
          {text}
        </span>
      )}
    </span>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
}) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <label htmlFor={fieldId} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[#0b0b0c]"
      />
      {label}
    </label>
  );
}

/* ---------------- Display ---------------- */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-mute">
      <LoaderCircle className="size-5 animate-[spin_0.8s_linear_infinite]" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 font-medium">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-yellow">
        <span className="size-4 rounded-sm bg-ink" />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-mute">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BOOKING_TONE: Record<BookingStatus, string> = {
  pending: 'bg-yellow text-ink border-yellow-deep',
  assigned: 'bg-white text-ink border-ink',
  on_the_way: 'bg-ink text-white border-ink',
  in_progress: 'bg-ink text-yellow border-ink',
  completed: 'bg-ok-soft text-ok border-ok/30',
  cancelled: 'bg-bad-soft text-bad border-bad/30',
};

export function StatusBadge({ status, testId }: { status: BookingStatus; testId?: string }) {
  return (
    <span
      data-testid={testId}
      data-status={status}
      className={clsx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', BOOKING_TONE[status])}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const SERVICE_TONE: Record<ServiceStatus, string> = {
  active: 'bg-ok-soft text-ok border-ok/30',
  unavailable: 'bg-warn-soft text-warn border-warn/30',
  hidden: 'bg-[#efede7] text-mute border-line',
};

export function ServiceBadge({ status }: { status: ServiceStatus }) {
  const text = status === 'active' ? 'Live' : status === 'unavailable' ? 'Unavailable' : 'Hidden';
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', SERVICE_TONE[status])}>
      {text}
    </span>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'bad' | 'warn' | 'yellow' | 'ink' }) {
  const tones = {
    neutral: 'bg-[#efede7] text-ink border-line',
    ok: 'bg-ok-soft text-ok border-ok/30',
    bad: 'bg-bad-soft text-bad border-bad/30',
    warn: 'bg-warn-soft text-warn border-warn/30',
    yellow: 'bg-yellow text-ink border-yellow-deep',
    ink: 'bg-ink text-white border-ink',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone])}>
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  const sizes = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-12 text-sm' };
  return (
    <span aria-hidden="true" className={clsx('grid shrink-0 place-items-center rounded-full bg-ink font-bold text-yellow', sizes[size])}>
      {initials}
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" aria-label={`${value} out of 5`}>
      <span className="text-ink" aria-hidden="true">
        ★
      </span>
      {value ? value.toFixed(1) : 'New'}
    </span>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <span className="text-mute">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Wraps wide tables so they scroll inside their card instead of the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold tracking-wide text-mute uppercase">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
