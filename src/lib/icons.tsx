import {
  AirVent,
  Bug,
  Droplets,
  Hammer,
  PaintRoller,
  Scissors,
  Shirt,
  Sparkles,
  SprayCan,
  WashingMachine,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  scissors: Scissors,
  'spray-can': SprayCan,
  'air-vent': AirVent,
  'washing-machine': WashingMachine,
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  'paint-roller': PaintRoller,
  bug: Bug,
  wrench: Wrench,
  shirt: Shirt,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] || Wrench;
  return <Icon className={className} aria-hidden="true" />;
}
