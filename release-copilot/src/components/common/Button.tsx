import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Ghost = 'ghost',
}

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: 'bg-primary text-on-primary hover:bg-primary/90',
  [ButtonVariant.Secondary]:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  [ButtonVariant.Ghost]: 'bg-transparent text-primary hover:bg-primary/10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = ({
  variant = ButtonVariant.Primary,
  className,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={cn(
      'text-body-md cursor-pointer rounded-xl px-4 py-2 font-medium transition-colors disabled:pointer-events-none disabled:cursor-default disabled:opacity-50',
      BUTTON_VARIANT_CLASSES[variant],
      className,
    )}
    {...rest}
  />
);

export default Button;
