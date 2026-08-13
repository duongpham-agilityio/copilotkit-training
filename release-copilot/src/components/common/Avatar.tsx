import { cn } from '@/lib/cn';

export const enum AvatarSize {
  Sm = 'sm',
  Md = 'md',
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  [AvatarSize.Sm]: 'w-6 h-6 text-label-sm',
  [AvatarSize.Md]: 'w-8 h-8 text-body-md',
};

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

const Avatar = ({ name, src, size = AvatarSize.Md }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', SIZE_CLASSES[size])}
      />
    );
  }

  return (
    <span
      className={cn(
        'bg-secondary-container text-on-secondary-container inline-flex items-center justify-center rounded-full font-medium',
        SIZE_CLASSES[size],
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

export default Avatar;
