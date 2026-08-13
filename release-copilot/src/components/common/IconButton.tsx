import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ButtonVariant, BUTTON_VARIANT_CLASSES } from './Button.tsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
  variant?: ButtonVariant;
}

const IconButton = ({
  icon,
  variant = ButtonVariant.Ghost,
  className,
  ...rest
}: IconButtonProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors disabled:pointer-events-none disabled:cursor-default disabled:opacity-50',
      BUTTON_VARIANT_CLASSES[variant],
      className,
    )}
    {...rest}
  >
    {icon}
  </button>
);

export default IconButton;
