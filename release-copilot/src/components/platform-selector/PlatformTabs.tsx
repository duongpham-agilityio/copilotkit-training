import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';

interface PlatformTabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PlatformTabs = ({
  items,
  value,
  onChange,
  disabled = false,
}: PlatformTabsProps) => (
  <Tabs
    items={items}
    value={value}
    onChange={onChange}
    variant={TabsVariant.Pill}
    disabled={disabled}
    className="text-label-sm"
  />
);

export default PlatformTabs;
