import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/cn';
import Tabs, { TabsVariant, type TabItem } from '@/components/common/Tabs.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { ROUTE_DASHBOARD, ROUTE_HISTORY } from '@/constants/routings.ts';

interface AppHeaderProps {
  actions?: ReactNode;
}

const NAV_ITEMS: TabItem[] = [
  { value: ROUTE_DASHBOARD, label: 'Dashboard' },
  { value: ROUTE_HISTORY, label: 'History' },
];

const AppHeader = ({ actions }: AppHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeNav = location.pathname === ROUTE_HISTORY ? ROUTE_HISTORY : ROUTE_DASHBOARD;

  const handleNavigate = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header className="border-outline-variant bg-surface-container-lowest relative border-b px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-headline-md text-on-surface shrink-0 font-semibold whitespace-nowrap">
          Release Copilot
        </span>
        <div className="hidden sm:block">
          <Tabs
            items={NAV_ITEMS}
            value={activeNav}
            onChange={handleNavigate}
            variant={TabsVariant.Underline}
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {actions}
          <IconButton
            icon={<Menu className="h-5 w-5" />}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="sm:hidden"
          />
        </div>
      </div>
      {menuOpen && (
        <div className="border-outline-variant bg-surface-container-lowest absolute inset-x-0 top-full z-10 border-b py-2 sm:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleNavigate(item.value)}
              className={cn(
                'text-body-md block w-full cursor-pointer px-6 py-2 text-left font-medium',
                item.value === activeNav
                  ? 'text-primary'
                  : 'text-on-surface-variant',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default AppHeader;
