import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import InlineBanner, { BannerVariant } from '../InlineBanner.tsx';

const meta: Meta<typeof InlineBanner> = {
  component: InlineBanner,
  title: 'common/InlineBanner',
};

export default meta;

type Story = StoryObj<typeof InlineBanner>;

export const Warning: Story = {
  args: {
    variant: BannerVariant.Warning,
    icon: <AlertTriangle className="size-4" />,
    children: 'Slack isn’t connected.',
    action: <button type="button">Connect</button>,
  },
};

export const ErrorVariant: Story = {
  name: 'Error',
  args: {
    variant: BannerVariant.Error,
    icon: <XCircle className="size-4" />,
    children: 'GitHub access expired.',
    action: <button type="button">Reconnect</button>,
  },
};

export const InfoVariant: Story = {
  name: 'Info',
  args: {
    variant: BannerVariant.Info,
    icon: <Info className="size-4" />,
    children: '3 new commits landed since your last release.',
  },
};
