import { useState } from 'react';
import { KeyRound, LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { useComingSoon } from '@/hooks/use-coming-soon.ts';
import Avatar, { AvatarSize } from './Avatar.tsx';
import DropdownMenu from './DropdownMenu.tsx';
import IconButton, { IconButtonSize } from './IconButton.tsx';

interface AccountMenuProps {
  userName: string;
  avatarSrc?: string;
  onSignOut: () => void;
}

const AccountMenu = ({ userName, avatarSrc, onSignOut }: AccountMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { showComingSoon } = useComingSoon();
  const showComingSoonFor = (feature: string) => () => {
    setIsOpen(false);
    showComingSoon(feature);
  };

  return (
    <div className="relative mt-1 flex h-8.5 items-center gap-2.5 rounded-lg pr-1 pl-2.5">
      <Avatar name={userName} src={avatarSrc} size={AvatarSize.Sm} />
      <span className="text-on-surface text-body-sm min-w-0 flex-1 truncate font-semibold">
        {userName}
      </span>
      <IconButton
        icon={<MoreHorizontal className="size-4" />}
        size={IconButtonSize.Sm}
        isActive={isOpen}
        aria-label="Account menu"
        onClick={() => setIsOpen((open) => !open)}
      />
      <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} className="bottom-9 left-0">
        <DropdownMenu.Item
          icon={<Settings className="size-4" />}
          onClick={showComingSoonFor('Settings')}
        >
          Settings
        </DropdownMenu.Item>
        <DropdownMenu.Item
          icon={<KeyRound className="size-4" />}
          hint="?"
          onClick={showComingSoonFor('Keyboard shortcuts')}
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
