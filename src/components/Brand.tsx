import clsx from 'clsx';

/**
 * Genie Sevai mark (same as the customer web app): the Genie lamp, its smoke rising to draw a
 * house roof, with sparkles. Solid brand colours only; `ring` adds a yellow outline on dark.
 */
export function BrandMark({ className, ring }: { className?: string; ring?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={clsx('inline-block size-9 shrink-0', className)}>
      <circle cx="32" cy="32" r="31" fill="#0B0B0C" />
      <path d="M52.6 33.4C58 28.4 56.6 23.4 50.6 20.4L40.5 12 30.4 20.4" fill="none" stroke="#FAFAF7" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47.6 26.6C45 25.4 45.6 22.4 48.2 22.6" fill="none" stroke="#FAFAF7" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 11.5 18.4 15.6 22.5 17 18.4 18.4 17 22.5 15.6 18.4 11.5 17 15.6 15.6Z" fill="#FFD400" />
      <path d="M50 43 50.9 45.6 53.5 46.5 50.9 47.4 50 50 49.1 47.4 46.5 46.5 49.1 45.6Z" fill="#FFD400" />
      <path d="M13.2 38.2C8 36.8 7 44 13.4 43.4" fill="none" stroke="#FFD400" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M22.5 47.6h11l2.6 3.9H19.9Z" fill="#E5BE00" stroke="#0B0B0C" strokeWidth="1.2" strokeLinejoin="round" />
      <path
        d="M12.4 39C12.4 45.4 19.3 48 28 48S41 45.6 44.2 42.2L53.4 35.6C54.6 34.7 53.8 33 52.4 33.5L43.6 36.7C40 35.6 35 35.1 28 35.1S12.4 36 12.4 39Z"
        fill="#FFD400"
        stroke="#0B0B0C"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M19.2 35.4C19.6 30.6 23.6 28.5 28 28.5S36.4 30.6 36.8 35.4Z" fill="#E5BE00" stroke="#0B0B0C" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="28" cy="26.4" r="2.2" fill="#FFD400" stroke="#0B0B0C" strokeWidth="1.1" />
      {ring && <circle cx="32" cy="32" r="31" fill="none" stroke="#FFD400" strokeWidth="1.2" />}
    </svg>
  );
}

/** "Genie" with the Genie smile, "Sevai" on a yellow tag, and a small area label (Admin / Pro / ...). */
export function Wordmark({ tone = 'light', sub = 'Admin' }: { tone?: 'light' | 'dark'; sub?: string }) {
  return (
    <span role="img" aria-label={`Genie Sevai ${sub}`} className={clsx('inline-flex items-center gap-2.5', tone === 'light' ? 'text-white' : 'text-ink')}>
      <BrandMark ring={tone === 'light'} />
      <span aria-hidden="true" className="flex flex-col leading-none">
        <span className="font-display inline-flex items-baseline gap-1 pb-1 text-[19px] font-extrabold tracking-tight">
          <span className="relative">
            Genie
            <svg viewBox="0 0 100 22" className="absolute -bottom-1 right-[-4%] w-[58%]">
              <path d="M6 5Q50 27 94 5" fill="none" stroke="#FFD400" strokeWidth="10" strokeLinecap="round" />
            </svg>
          </span>
          <span className="rounded bg-yellow px-1 pb-px text-[0.8em] text-ink">Sevai</span>
        </span>
        <span className={clsx('mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase', tone === 'light' ? 'text-white/60' : 'text-mute')}>{sub}</span>
      </span>
    </span>
  );
}
