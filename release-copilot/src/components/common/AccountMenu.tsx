import { useState } from 'react';
import { KeyRound, LogOut, Settings } from 'lucide-react';
import Avatar, { AvatarSize } from './Avatar.tsx';
import DropdownMenu from './DropdownMenu.tsx';

interface AccountMenuProps {
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
}

const AccountMenu = ({ userName, avatarSrc, onSignOut }: AccountMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2.5 px-1">
      <Avatar name={userName} src={avatarSrc} size={AvatarSize.Sm} />
      <span className="text-on-surface text-label-sm min-w-0 flex-1 truncate font-semibold">
        {userName}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        className="text-on-surface-variant hover:bg-surface-container flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} className="bottom-9 left-0">
        <DropdownMenu.Item icon={<Settings className="size-4" />} onClick={() => setIsOpen(false)}>
          Settings
        </DropdownMenu.Item>
        <DropdownMenu.Item
          icon={<KeyRound className="size-4" />}
          hint="?"
          onClick={() => setIsOpen(false)}
        >
          Keyboard shortcuts
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={<LogOut className="size-4" />} onClick={onSignOut} danger>
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu>
    </div>
  );
};

export default AccountMenu;
