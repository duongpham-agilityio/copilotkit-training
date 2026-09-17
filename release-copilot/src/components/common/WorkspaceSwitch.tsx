import { ArrowRight, ChevronsUpDown } from 'lucide-react';

interface WorkspaceSwitchProps {
  name: string;
  slug: string;
  onClick?: () => void;
}

const WorkspaceSwitch = ({ name, slug, onClick }: WorkspaceSwitchProps) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-surface-container -ml-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 text-left"
  >
    <span className="bg-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
      <ArrowRight className="size-3.5 text-white" strokeWidth={2.5} />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-label-sm text-on-surface truncate font-semibold">{name}</span>
      <span className="text-on-surface-variant truncate font-mono text-[11px]">{slug}</span>
    </span>
    <ChevronsUpDown className="text-on-surface-variant size-3.5 shrink-0" />
  </button>
);

export default WorkspaceSwitch;
