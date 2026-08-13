import { cn } from '@/lib/cn';

export const enum TabsVariant {
  Pill = 'pill',
  Underline = 'underline',
}

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: TabsVariant;
}

const CONTAINER_CLASSES: Record<TabsVariant, string> = {
  [TabsVariant.Pill]: 'inline-flex gap-1 bg-surface-container rounded-full p-1',
  [TabsVariant.Underline]: 'flex gap-6 border-b border-outline-variant',
};

const activeTabClasses = (variant: TabsVariant) =>
  variant === TabsVariant.Pill
    ? 'bg-surface-container-lowest text-on-surface rounded-full shadow-sm px-3 py-1.5'
    : 'text-primary border-b-2 border-primary pb-3';

const inactiveTabClasses = (variant: TabsVariant) =>
  variant === TabsVariant.Pill
    ? 'text-on-surface-variant px-3 py-1.5'
    : 'text-on-surface-variant border-b-2 border-transparent pb-3';

const Tabs = ({
  items,
  value,
  onChange,
  variant = TabsVariant.Pill,
}: TabsProps) => (
  <div className={CONTAINER_CLASSES[variant]}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        aria-selected={item.value === value}
        onClick={() => onChange(item.value)}
        className={cn(
          'text-body-md cursor-pointer font-medium transition-all',
          item.value === value
            ? activeTabClasses(variant)
            : inactiveTabClasses(variant),
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export default Tabs;
