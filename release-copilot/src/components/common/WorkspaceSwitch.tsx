import { ChevronsUpDown } from 'lucide-react';
import BrandMark from './BrandMark.tsx';

interface WorkspaceSwitchProps {
  name: string;
  slug: string;
  onClick?: () => void;
}

const WorkspaceSwitch = ({ name, slug, onClick }: WorkspaceSwitchProps) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-surface-container -ml-1.5 flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[10px] p-1.5 text-left"
  >
    <BrandMark />
    <span className="flex min-w-0 flex-1 flex-col gap-px">
      <span className="text-body-sm text-on-surface truncate font-semibold tracking-[-0.01em]">
        {name}
      </span>
      <span className="text-on-surface-muted truncate font-mono text-[11px]">{slug}</span>
    </span>
    <ChevronsUpDown className="text-on-surface-muted size-3.5 shrink-0" />
  </button>
);

export default WorkspaceSwitch;
