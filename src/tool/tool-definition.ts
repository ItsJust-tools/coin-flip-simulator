import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_BATCH,
  MAX_HISTORY,
  MIN_BATCH,
  clampBatch,
  computeStreak,
  fairnessDeviation,
  fairnessLabel,
  flipMany,
  headsPercent,
  lastFlipText,
  summaryText,
  withFlip,
  type FlipEntry,
  type SessionStats,
  type Side,
  type ToolState,
} from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    batchCount: clampBatch(state.batchCount),
    history: state.history,
    stats: state.stats,
  });
}

function numberInRange(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_BATCH, Math.max(MIN_BATCH, Math.floor(n)));
}

function validSide(value: unknown): value is Side {
  return value === 'heads' || value === 'tails';
}

function validStats(value: unknown): SessionStats {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Partial<SessionStats>;
  return {
    totalFlips: Number.isFinite(v.totalFlips) ? Number(v.totalFlips) : 0,
    heads: Number.isFinite(v.heads) ? Number(v.heads) : 0,
    tails: Number.isFinite(v.tails) ? Number(v.tails) : 0,
  };
}

function validHistory(value: unknown): FlipEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is FlipEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        validSide((entry as FlipEntry).side) &&
        typeof (entry as FlipEntry).count === 'number' &&
        Number.isFinite((entry as FlipEntry).count) &&
        (entry as FlipEntry).count > 0 &&
        typeof (entry as FlipEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected coin flip simulator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    batchCount: numberInRange(v.batchCount, DEFAULT_STATE.batchCount),
    history: validHistory(v.history),
    stats: validStats(v.stats),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const coinFlipTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE } as ToolState,
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  DEFAULT_STATE,
  clampBatch,
  computeStreak,
  fairnessDeviation,
  fairnessLabel,
  flipMany,
  headsPercent,
  lastFlipText,
  summaryText,
  withFlip,
};
