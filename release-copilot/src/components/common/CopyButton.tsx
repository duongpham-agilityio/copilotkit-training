import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button, { ButtonVariant } from './Button.tsx';

const COPY_FEEDBACK_DURATION_MS = 2000;

interface CopyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onCopy: () => void;
  variant?: ButtonVariant;
  children?: ReactNode;
}

const CopyButton = ({
  onCopy,
  variant = ButtonVariant.Ghost,
  className,
  children = 'Copy',
  ...rest
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), []);

  const handleClick = () => {
    onCopy();
    setCopied(true);
    clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(
      () => setCopied(false),
      COPY_FEEDBACK_DURATION_MS,
    );
  };

  return (
    <Button variant={variant} className={className} {...rest} onClick={handleClick}>
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex size-4 shrink-0">
          <Copy
            className={cn(
              'absolute inset-0 size-4 transition-all duration-200 ease-out',
              copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
            )}
          />
          <Check
            className={cn(
              'absolute inset-0 size-4 transition-all duration-200 ease-out',
              copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          />
        </span>
        {copied ? 'Copied' : children}
      </span>
    </Button>
  );
};

export default CopyButton;
