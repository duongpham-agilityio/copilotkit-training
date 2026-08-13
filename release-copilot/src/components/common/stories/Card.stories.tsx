import type { Meta, StoryObj } from '@storybook/react-vite';
import Card, { CardEmphasis } from '../Card.tsx';

const meta: Meta<typeof Card> = {
  component: Card,
  title: 'common/Card',
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Raised: Story = {
  args: { emphasis: CardEmphasis.Raised, children: 'Raised card content' },
};

export const Outlined: Story = {
  args: { emphasis: CardEmphasis.Outlined, children: 'Outlined card content' },
};

export const WithHeader: Story = {
  render: () => (
    <Card emphasis={CardEmphasis.Raised}>
      <Card.Header>Card header</Card.Header>
      Card body content
    </Card>
  ),
};
