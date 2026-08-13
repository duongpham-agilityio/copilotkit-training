import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import { Platform } from '@/types/platform.ts';

interface PlatformTabsProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const PLATFORM_ITEMS: TabItem[] = [
  { value: Platform.Github, label: 'GitHub' },
  { value: Platform.AppStore, label: 'App Store' },
  { value: Platform.GooglePlay, label: 'Google Play' },
];

const PlatformTabs = ({ value, onChange }: PlatformTabsProps) => (
  <Tabs
    items={PLATFORM_ITEMS}
    value={value}
    onChange={(v) => onChange(v as Platform)}
    variant={TabsVariant.Pill}
  />
);

export default PlatformTabs;
