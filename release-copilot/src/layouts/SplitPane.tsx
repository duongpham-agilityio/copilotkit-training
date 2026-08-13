import type { ReactNode } from 'react';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidthPercent?: number;
}

const SplitPane = ({ left, right, leftWidthPercent = 65 }: SplitPaneProps) => (
  <div
    className="grid gap-6"
    style={{
      gridTemplateColumns: `${leftWidthPercent}% ${100 - leftWidthPercent}%`,
    }}
  >
    <div>{left}</div>
    <div>{right}</div>
  </div>
);

export default SplitPane;
