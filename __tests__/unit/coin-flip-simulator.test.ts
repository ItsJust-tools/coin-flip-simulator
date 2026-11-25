import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_STATE,
  MAX_BATCH,
  MAX_HISTORY,
  MIN_BATCH,
  clampBatch,
  computeStreak,
  fairnessDeviation,
  fairnessLabel,
  flipCoin,
  flipMany,
  headsPercent,
  lastFlipText,
  summaryText,
  withFlip,
  type FlipEntry,
  type ToolState,
} from '@/tool/types';
import { deserializeState, serializeState, roundTrips, coinFlipTool } from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({
  ...structuredClone(DEFAULT_STATE),
  ...patch,
});

const entry = (
  side: 'heads' | 'tails',
  count = 1,
  createdAt = '2026-11-25T10:00:00.000Z'
): FlipEntry => ({
  side,
  count,
  createdAt,
});

describe('flipCoin', () => {
  it('maps rng below 0.5 to heads and at/above to tails', () => {
    expect(flipCoin(() => 0)).toBe('heads');
    expect(flipCoin(() => 0.49)).toBe('heads');
    expect(flipCoin(() => 0.5)).toBe('tails');
    expect(flipCoin(() => 0.999)).toBe('tails');
  });

  it('uses the real crypto-backed random by default and returns a valid side', () => {
    const side = flipCoin();
    expect(['heads', 'tails']).toContain(side);
  });
});

describe('flipMany', () => {
  it('returns exactly n results for a valid count', () => {
    const rng = () => 0.25;
    const result = flipMany(7, rng);
    expect(result).toHaveLength(7);
    expect(result.every((s) => s === 'heads')).toBe(true);
  });

  it('clamps out-of-range counts into the supported range', () => {
    expect(flipMany(0)).toHaveLength(MIN_BATCH);
    expect(flipMany(-5)).toHaveLength(MIN_BATCH);
    expect(flipMany(1000)).toHaveLength(MAX_BATCH);
    expect(flipMany(1.9)).toHaveLength(1);
  });

  it('returns an empty-safe default for unparseable sizes', () => {
    expect(flipMany(Number.NaN)).toHaveLength(DEFAULT_STATE.batchCount);
  });
});

describe('clampBatch', () => {
  it('clamps to [1, 100] and floors decimals', () => {
    expect(clampBatch(1)).toBe(1);
    expect(clampBatch(100)).toBe(100);
    expect(clampBatch(0)).toBe(1);
    expect(clampBatch(-10)).toBe(1);
    expect(clampBatch(101)).toBe(100);
    expect(clampBatch(7.9)).toBe(7);
    expect(clampBatch(Number.NaN)).toBe(DEFAULT_STATE.batchCount);
    expect(clampBatch(Number.POSITIVE_INFINITY)).toBe(DEFAULT_STATE.batchCount);
  });
});

describe('withFlip', () => {
  it('appends a single-coin entry and updates stats', () => {
    const next = withFlip(state(), ['tails']);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({ side: 'tails', count: 1 });
    expect(next.stats).toEqual({ totalFlips: 1, heads: 0, tails: 1 });
  });

  it('records one history entry per batch with the majority side', () => {
    const next = withFlip(state(), ['heads', 'tails', 'heads']);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]!.count).toBe(3);
    expect(next.history[0]!.side).toBe('heads');
    expect(next.stats).toEqual({ totalFlips: 3, heads: 2, tails: 1 });
  });

  it('a 50/50 tie inside a batch resolves to heads', () => {
    const next = withFlip(state(), ['heads', 'heads', 'tails', 'tails']);
    expect(next.history[0]!.side).toBe('heads');
  });

  it('caps history at MAX_HISTORY, newest first', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      s = withFlip(s, ['heads'], new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.stats.totalFlips).toBe(MAX_HISTORY + 10);
    // newest first: earlier timestamps at the end
    expect(new Date(s.history[0]!.createdAt).getTime()).toBeGreaterThan(
      new Date(s.history[MAX_HISTORY - 1]!.createdAt).getTime()
    );
  });

  it('ignores empty flip lists', () => {
    const s = state({ history: [entry('heads')] });
    const next = withFlip(s, []);
    expect(next).toBe(s);
  });
});

describe('computeStreak', () => {
  it('returns zeros when history is empty', () => {
    expect(computeStreak([])).toEqual({ side: null, current: 0, longest: 0, longestSide: null });
  });

  it('tracks a single-side run', () => {
    const history = [entry('heads'), entry('heads'), entry('heads')];
    expect(computeStreak(history)).toEqual({
      side: 'heads',
      current: 3,
      longest: 3,
      longestSide: 'heads',
    });
  });

  it('counts multi-coin events by their coin count and finds the longest run', () => {
    // history is newest first; chronological order is reversed
    const history = [
      entry('tails', 2, '2026-01-01T00:03:00Z'),
      entry('heads', 5, '2026-01-01T00:02:00Z'),
      entry('heads', 1, '2026-01-01T00:01:00Z'),
      entry('tails', 1, '2026-01-01T00:00:00Z'),
    ];
    const streak = computeStreak(history);
    expect(streak.current).toBe(2);
    expect(streak.side).toBe('tails');
    expect(streak.longest).toBe(6);
    expect(streak.longestSide).toBe('heads');
  });
});

describe('statistics helpers', () => {
  it('headsPercent is null before any flips and accurate after', () => {
    expect(headsPercent(DEFAULT_STATE.stats)).toBeNull();
    expect(headsPercent({ totalFlips: 10, heads: 7, tails: 3 })).toBeCloseTo(70);
  });

  it('fairnessDeviation measures distance from an even split', () => {
    expect(fairnessDeviation({ totalFlips: 0, heads: 0, tails: 0 })).toBeNull();
    expect(fairnessDeviation({ totalFlips: 10, heads: 5, tails: 5 })).toBeCloseTo(0);
    expect(fairnessDeviation({ totalFlips: 10, heads: 10, tails: 0 })).toBeCloseTo(50);
    expect(fairnessDeviation({ totalFlips: 10, heads: 0, tails: 10 })).toBeCloseTo(50);
  });

  it('fairnessLabel reflects the deviation', () => {
    expect(fairnessLabel({ totalFlips: 0, heads: 0, tails: 0 })).toBe('unknown');
    expect(fairnessLabel({ totalFlips: 100, heads: 52, tails: 48 })).toBe('fair');
    expect(fairnessLabel({ totalFlips: 10, heads: 10, tails: 0 })).toBe('plausible');
  });
});

describe('summaryText and lastFlipText', () => {
  it('summarizes an empty session', () => {
    expect(summaryText(DEFAULT_STATE)).toBe('No flips yet — flip a coin to begin');
    expect(lastFlipText(DEFAULT_STATE)).toBeNull();
  });

  it('summarizes totals, split and longest streak', () => {
    const s = state({
      history: [entry('heads', 2)],
      stats: { totalFlips: 4, heads: 3, tails: 1 },
    });
    const summary = summaryText(s);
    expect(summary).toContain('4 flips');
    expect(summary).toContain('75.0% heads');
    expect(summary).toContain('longest streak 2');
    expect(lastFlipText(s)).toBe('heads (2 coins)');
    expect(lastFlipText(state({ history: [entry('tails')] }))).toBe('tails');
  });
});

describe('serialize/deserialize round-trip', () => {
  it('round-trips a full state without data loss', () => {
    const full = state({
      batchCount: 25,
      history: [entry('heads', 5), entry('tails', 1)],
      stats: { totalFlips: 6, heads: 5, tails: 1 },
    });
    expect(roundTrips(full)).toBe(true);
  });

  it('round-trips the default state', () => {
    expect(roundTrips(state())).toBe(true);
  });

  it('serializes to valid JSON with the expected keys', () => {
    const s = state({ history: [entry('heads')] });
    const parsed = JSON.parse(serializeState(s)) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['batchCount', 'history', 'stats']);
  });

  it('deserializes valid payloads', () => {
    const payload = {
      batchCount: 10,
      history: [{ side: 'tails', count: 10, createdAt: '2026-11-25T10:00:00.000Z' }],
      stats: { totalFlips: 10, heads: 4, tails: 6 },
    };
    const result = deserializeState(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batchCount).toBe(10);
      expect(result.data.history).toEqual(payload.history);
      expect(result.data.stats).toEqual(payload.stats);
    }
  });

  it('repairs invalid payloads with defaults', () => {
    const bad = deserializeState({ nope: true });
    expect(bad.success).toBe(true);
    if (bad.success) {
      expect(bad.data.batchCount).toBe(DEFAULT_STATE.batchCount);
      expect(bad.data.history).toEqual([]);
    }
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('drops malformed history entries and clamps batch size', () => {
    const result = deserializeState({
      batchCount: 5000,
      history: [
        'garbage',
        null,
        { side: 'sideways', count: 1, createdAt: 'x' },
        { side: 'heads', count: 0, createdAt: 'x' },
        { side: 'heads', count: 2, createdAt: '2026-11-25T10:00:00.000Z' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batchCount).toBe(MAX_BATCH);
      expect(result.data.history).toHaveLength(1);
      expect(result.data.history[0]!.side).toBe('heads');
    }
  });

  it('caps restored history at MAX_HISTORY', () => {
    const many = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      side: 'heads' as const,
      count: 1,
      createdAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    }));
    const result = deserializeState({ history: many });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toHaveLength(MAX_HISTORY);
  });

  it('exposes the tool contract through coinFlipTool', () => {
    expect(coinFlipTool.id).toBe('coin-flip-simulator');
    expect(coinFlipTool.name).toBe('Coin Flip Simulator');
    const serialized = coinFlipTool.serialize(state({ batchCount: 5 }));
    const restored = coinFlipTool.deserialize(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    expect(coinFlipTool.initialState).toEqual(DEFAULT_STATE);
  });
});

describe('deterministic integration', () => {
  it('flipping with a biased rng updates stats and streaks consistently', () => {
    const rng = (i: number) => (i % 2 === 0 ? 0.1 : 0.9);
    const seq = Array.from({ length: 10 }, (_, i) => flipCoin(() => rng(i)));
    let s = state();
    s = withFlip(s, seq);
    expect(s.stats.totalFlips).toBe(10);
    expect(s.stats.heads).toBe(5);
    expect(s.stats.tails).toBe(5);
    expect(headsPercent(s.stats)).toBeCloseTo(50);
    expect(fairnessLabel(s.stats)).toBe('fair');
  });

  it('vi.fn-based random injects predictable sides', () => {
    const rng = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.8);
    const next = withFlip(state(), [flipCoin(rng), flipCoin(rng)]);
    expect(next.history[0]!.count).toBe(2);
    expect(next.stats.totalFlips).toBe(2);
  });
});
