import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: 'coin-flip-simulator',
  name: 'Coin Flip Simulator',
  description:
    'Flip one or many virtual coins with streak tracking, cumulative statistics and shareable results.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  ogImage: '/og.svg',
  theme: {
    accent: '#16a34a',
    accentHover: '#15803d',
    accentSubtle: 'rgba(22, 163, 74, 0.12)',
  },
  shortcuts: [
    {
      title: 'Flipping',
      shortcuts: [
        { keys: 'F', label: 'Flip one coin' },
        { keys: 'B', label: 'Flip a batch' },
        { keys: 'H', label: 'Save to history' },
        { keys: 'C', label: 'Copy summary' },
      ],
    },
  ],
};

export default toolConfig;
