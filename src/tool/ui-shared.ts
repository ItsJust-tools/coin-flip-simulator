import { DEFAULT_STATE, type Side, type ToolState } from './types';

/** Flip modes offered in the toolbar. */
export const FLIP_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '×1' },
  { value: 5, label: '×5' },
  { value: 10, label: '×10' },
  { value: 25, label: '×25' },
  { value: 100, label: '×100' },
];

export const SIDE_EMOJI: Record<Side, string> = {
  heads: '🪙 H',
  tails: '🪙 T',
};

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.history === 'object' && DEFAULT_STATE !== undefined;
}
