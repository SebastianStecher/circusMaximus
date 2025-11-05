import type { Meta, StoryObj } from '@storybook/svelte';
import InfiniteGame from '../test/InfiniteGame.svelte';

const meta = {
  title: 'Slot/InfiniteGame',
  component: InfiniteGame,
  args: {},
} satisfies Meta<InfiniteGame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};