export type Side = 'heads' | 'tails';

export interface FlipEntry {
  /** Result side of this flip. */
  side: Side;
  /** How many coins were flipped in this event. */
  count: number;
  /** ISO timestamp when the flip happened. */
  createdAt: string;
}

export interface StreakInfo {
  /** Side of the current streak, null when no flips yet. */
  side: Side | null;
  /** Length of the current streak. */
  current: number;
  /** Longest streak seen in this session. */
  longest: number;
  /** Side of the longest streak. */
  longestSide: Side | null;
}

export interface SessionStats {
  /** Total number of individual coins flipped. */
  totalFlips: number;
  /** Total number of heads seen. */
  heads: number;
  /** Total number of tails seen. */
  tails: number;
}

export interface ToolState {
  /** Number of coins to flip per batch (1-100). */
  batchCount: number;
  /** Flip history, newest first. */
  history: FlipEntry[];
  /** Running session statistics. */
  stats: SessionStats;
}

export const DEFAULT_STATE: ToolState = {
  batchCount: 1,
  history: [],
  stats: { totalFlips: 0, heads: 0, tails: 0 },
};

export const MAX_HISTORY = 50;
export const MIN_BATCH = 1;
export const MAX_BATCH = 100;
export const WORDS_PER_MINUTE = 200;

/** Cryptographically-biased-free coin flip; falls back to Math.random. */
export function flipCoin(random: () => number = defaultRandom): Side {
  return random() < 0.5 ? 'heads' : 'tails';
}

function defaultRandom(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! / 2 ** 32;
  }
  return Math.random();
}

/** Clamp a requested batch size into the supported range. */
export function clampBatch(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STATE.batchCount;
  return Math.min(MAX_BATCH, Math.max(MIN_BATCH, Math.floor(value)));
}

/** Flip `count` coins at once. */
export function flipMany(count: number, random: () => number = defaultRandom): Side[] {
  const n = clampBatch(count);
  return Array.from({ length: n }, () => flipCoin(random));
}

/** Update a state with the results of a flip event, keeping the history cap. */
export function withFlip(state: ToolState, sides: Side[], now = new Date()): ToolState {
  if (sides.length === 0) return state;
  const entry: FlipEntry = {
    side:
      sides.length === 1
        ? sides[0]!
        : sides.filter((s) => s === 'heads').length >= sides.length / 2
          ? 'heads'
          : 'tails',
    count: sides.length,
    createdAt: now.toISOString(),
  };
  const heads = sides.filter((s) => s === 'heads').length;
  const tails = sides.length - heads;
  return {
    ...state,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
    stats: {
      totalFlips: state.stats.totalFlips + sides.length,
      heads: state.stats.heads + heads,
      tails: state.stats.tails + tails,
    },
  };
}

/**
 * Compute the current and longest streak from history (chronological order,
 * i.e. reversed history). Uses per-event count for multi-coin flips, where
 * all coins in one event share the event's majority side.
 */
export function computeStreak(history: FlipEntry[]): StreakInfo {
  const chrono = [...history].reverse();
  let side: Side | null = null;
  let current = 0;
  let longest = 0;
  let longestSide: Side | null = null;
  for (const entry of chrono) {
    if (entry.side === side) {
      current += entry.count;
    } else {
      side = entry.side;
      current = entry.count;
    }
    if (current > longest) {
      longest = current;
      longestSide = side;
    }
  }
  return { side, current, longest, longestSide };
}

/** Head percentage of the session stats, null when no flips yet. */
export function headsPercent(stats: SessionStats): number | null {
  if (stats.totalFlips === 0) return null;
  return (stats.heads / stats.totalFlips) * 100;
}

/** Absolute deviation from a fair 50/50 split, in percentage points. */
export function fairnessDeviation(stats: SessionStats): number | null {
  if (stats.totalFlips === 0) return null;
  const heads = stats.heads;
  const tails = stats.tails;
  const half = stats.totalFlips / 2;
  return (Math.abs(tails - half) / stats.totalFlips) * 100;
}

/** Fairness label derived from the deviation from 50/50. */
export function fairnessLabel(stats: SessionStats): 'fair' | 'plausible' | 'unknown' {
  const deviation = fairnessDeviation(stats);
  if (deviation === null) return 'unknown';
  // With enough flips, |deviation| under ~5pp is very plausible for a fair coin.
  return deviation <= 5 ? 'fair' : 'plausible';
}

/** Compact one-line summary for status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const percent = headsPercent(state.stats);
  if (percent === null) return 'No flips yet — flip a coin to begin';
  const streak = computeStreak(state.history);
  return `${state.stats.totalFlips} flips · ${percent.toFixed(1)}% heads · longest streak ${streak.longest}`;
}

/** Human-readable text for the last flip event, or null. */
export function lastFlipText(state: ToolState): string | null {
  const last = state.history[0];
  if (!last) return null;
  return last.count === 1 ? last.side : `${last.side} (${last.count} coins)`;
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.history === 'object';
}
