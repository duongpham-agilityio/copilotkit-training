import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThreadListItem from '../ThreadListItem.tsx';
import type { ThreadSummary } from '@/types/thread.ts';

const meta: Meta<typeof ThreadListItem> = {
  component: ThreadListItem,
  title: 'chat/ThreadListItem',
};

export default meta;

type Story = StoryObj<typeof ThreadListItem>;

const makeThread = (id: string, title: string): ThreadSummary => ({
  id,
  title,
  resourceId: 'user-1',
  createdAt: '2026-09-17T10:00:00.000Z',
  updatedAt: '2026-09-17T10:00:00.000Z',
});

export const List: Story = {
  render: () => {
    const [activeId, setActiveId] = useState('t1');
    const items: Array<{ thread: ThreadSummary; time?: string }> = [
      { thread: makeThread('t1', 'v2.5.0 · Slack digest & templates') },
      { thread: makeThread('t2', 'Changelog parser dependency bump'), time: '2h' },
      { thread: makeThread('t3', 'App Store tone pass'), time: 'Tue' },
      { thread: makeThread('t4', 'v2.3.1 · duplicate tag hotfix'), time: 'Aug 26' },
    ];
    return (
      <ul className="bg-surface-container-low w-70 rounded-lg p-2">
        {/* Rendered on the sidebar's own subtle background so the active row's
            brighter surface-container-lowest fill is visible, matching AppSidebar. */}
        {items.map(({ thread, time }) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            time={time}
            isActive={thread.id === activeId}
            onSelect={setActiveId}
          />
        ))}
      </ul>
    );
  },
};

export const WithoutTime: Story = {
  args: {
    thread: makeThread('t1', 'A thread with no time shown'),
    isActive: false,
    onSelect: () => {},
  },
};
