import clsx from 'clsx';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { assetUrl } from '../lib/api';
import { ART_LABEL, HEX_RE } from '../lib/banners';
import type { Banner } from '../lib/types';

export type PreviewBanner = Pick<
  Banner,
  'title' | 'subtitle' | 'eyebrow' | 'ctaLabel' | 'imageUrl' | 'layout' | 'background' | 'textTone' | 'art' | 'action'
>;

const INK = '#111111';
const WHITE = '#FFFFFF';

function Placeholder({ label, light, small, full }: { label: string; light: boolean; small: boolean; full?: boolean }) {
  return (
    <div
      data-testid="banner-preview-placeholder"
      className={clsx(
        'absolute flex flex-col items-center justify-center gap-1 rounded-lg border-dashed text-center font-semibold',
        full ? 'inset-[6%]' : 'inset-[8%]',
        small ? 'border px-1 text-[8px] leading-tight' : 'border-2 px-2 text-[12px]',
      )}
      style={{
        borderColor: light ? 'rgba(255,255,255,0.45)' : 'rgba(17,17,17,0.28)',
        backgroundColor: light ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,17,0.05)',
        color: light ? 'rgba(255,255,255,0.85)' : 'rgba(17,17,17,0.6)',
      }}
    >
      <ImageIcon className={small ? 'size-3' : 'size-5'} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Approximation of how a banner looks on the customer home page (1600×600, i.e. 8:3).
 * `size="sm"` is the thumbnail used in the list; `decorative` hides it from assistive tech when the
 * same details are already written out next to it.
 */
export function BannerPreview({
  banner,
  size = 'lg',
  decorative,
  className,
  testId = 'banner-preview',
}: {
  banner: PreviewBanner;
  size?: 'sm' | 'lg';
  decorative?: boolean;
  className?: string;
  testId?: string;
}) {
  const [failed, setFailed] = useState('');
  const small = size === 'sm';
  const light = banner.textTone === 'light';
  const ink = light ? WHITE : INK;
  const bg = HEX_RE.test(banner.background) ? banner.background : '#F2F2F4';
  const src = assetUrl(banner.imageUrl);
  const showImage = !!src && failed !== src;
  const missingLabel = src ? 'Picture not found' : '';

  return (
    <div
      data-testid={testId}
      data-layout={banner.layout}
      aria-hidden={decorative || undefined}
      className={clsx('relative aspect-[8/3] w-full overflow-hidden border border-black/5', small ? 'rounded-xl' : 'rounded-2xl', className)}
      style={{ backgroundColor: bg, color: ink }}
    >
      {banner.layout === 'image' ? (
        showImage ? (
          <img
            src={src}
            alt={banner.title}
            loading={small ? 'lazy' : undefined}
            decoding="async"
            onError={() => setFailed(src)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Placeholder full light={light} small={small} label={missingLabel || 'Upload the banner artwork'} />
        )
      ) : (
        <>
          <div className="absolute inset-y-0 right-0 w-[42%]">
            {showImage ? (
              <img
                src={src}
                alt=""
                loading={small ? 'lazy' : undefined}
                decoding="async"
                onError={() => setFailed(src)}
                className="size-full object-cover"
              />
            ) : (
              <Placeholder
                light={light}
                small={small}
                label={missingLabel || (banner.art ? `${ART_LABEL[banner.art]} illustration` : 'No picture')}
              />
            )}
          </div>
          <div className={clsx('relative z-10 flex h-full max-w-[58%] min-w-0 flex-col justify-center', small ? 'p-3' : 'p-5 sm:p-7')}>
            {banner.eyebrow && (
              <p
                className={clsx(
                  'truncate font-semibold uppercase',
                  small ? 'text-[8px] tracking-[0.12em]' : 'text-[10px] tracking-[0.14em] sm:text-[11px]',
                )}
                style={{ opacity: 0.75 }}
              >
                {banner.eyebrow}
              </p>
            )}
            <p
              className={clsx(
                'font-display font-bold break-words',
                small ? 'mt-0.5 line-clamp-1 text-[13px] leading-[1.2]' : 'mt-1.5 line-clamp-2 text-[20px] leading-[1.05] tracking-[-0.02em] sm:text-[28px]',
              )}
              style={banner.title ? undefined : { opacity: 0.4 }}
            >
              {banner.title || 'Your headline'}
            </p>
            {banner.subtitle && (
              <p
                className={clsx(small ? 'mt-0.5 line-clamp-1 text-[9px]' : 'mt-1.5 line-clamp-2 text-[12px] sm:text-[14px]')}
                style={{ opacity: 0.8 }}
              >
                {banner.subtitle}
              </p>
            )}
            {banner.action !== 'none' && (
              <span
                className={clsx(
                  'inline-flex w-fit max-w-full items-center font-semibold whitespace-nowrap',
                  small ? 'mt-1.5 h-5 gap-1 rounded-md px-2 text-[8px]' : 'mt-3 h-8 gap-1.5 rounded-lg px-3 text-[12px] sm:h-9 sm:text-[13px]',
                )}
                style={{ backgroundColor: ink, color: light ? (bg.toUpperCase() === WHITE ? INK : bg) : WHITE }}
              >
                <span className="truncate">{banner.ctaLabel || 'Book now'}</span>
                <ArrowRight className={small ? 'size-2.5' : 'size-3.5'} aria-hidden="true" />
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
