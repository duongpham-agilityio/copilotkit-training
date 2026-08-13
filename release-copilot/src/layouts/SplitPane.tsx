import type { ReactNode } from 'react';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidthPercent?: number;
}

const SplitPane = ({ left, right, leftWidthPercent = 65 }: SplitPaneProps) => (
  <div
    className="grid h-full gap-6"
    style={{
      gridTemplateColumns: `${leftWidthPercent}% ${100 - leftWidthPercent}%`,
    }}
  >
    <div className="h-full min-h-0 overflow-y-auto">{left}</div>
    <div className="h-full min-h-0">{right}</div>
  </div>
);

export default SplitPane;
