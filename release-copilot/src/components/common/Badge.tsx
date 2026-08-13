import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const enum BadgeVariant {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Neutral = 'neutral',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  [BadgeVariant.Success]: 'bg-success-emerald/10 text-success-emerald',
  [BadgeVariant.Error]: 'bg-error-rose/10 text-error-rose',
  [BadgeVariant.Warning]: 'bg-warning-purple/10 text-warning-purple',
  [BadgeVariant.Neutral]: 'bg-surface-container text-on-surface-variant',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const Badge = ({ variant, children }: BadgeProps) => (
  <span
    className={cn(
      'text-label-sm inline-flex items-center rounded-full px-3 py-1',
      VARIANT_CLASSES[variant],
    )}
  >
    {children}
  </span>
);

export default Badge;
