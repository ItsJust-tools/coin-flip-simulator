'use client';

import React from 'react';
import {
  clampBatch,
  computeStreak,
  fairnessDeviation,
  fairnessLabel,
  headsPercent,
  lastFlipText,
  type ToolState,
} from '../types';
import { FLIP_OPTIONS, SIDE_EMOJI } from '../ui-shared';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
  onFlip?: (count: number) => void;
}

const btnClass =
  'rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory, onFlip }) => {
  const percent = headsPercent(state.stats);
  const streak = computeStreak(state.history);
  const deviation = fairnessDeviation(state.stats);
  const fairness = fairnessLabel(state.stats);
  const last = lastFlipText(state);

  const updateBatch = (value: number) => onChange?.({ ...state, batchCount: clampBatch(value) });

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="coin-flip-canvas">
      <div className="flex flex-wrap items-center gap-2" data-testid="batch-controls">
        <label
          className="text-xs font-medium text-gray-700 dark:text-gray-300"
          htmlFor="batch-input"
        >
          Coins per flip
        </label>
        <input
          id="batch-input"
          type="number"
          min={1}
          max={100}
          value={state.batchCount}
          onChange={(e) => updateBatch(Number(e.target.value))}
          data-testid="batch-input"
          className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Quick batch sizes">
          {FLIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`batch-preset-${opt.value}`}
              aria-pressed={state.batchCount === opt.value}
              onClick={() => updateBatch(opt.value)}
              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                state.batchCount === opt.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onFlip?.(state.batchCount)}
          data-testid="btn-flip"
          className={btnClass}
        >
          Flip {state.batchCount} coin{state.batchCount === 1 ? '' : 's'}
        </button>
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Last flip
        </span>
        <span className="block font-mono text-3xl font-bold" data-testid="result-main">
          {last ?? '—'}
        </span>
        <span
          className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
          data-testid="result-summary"
        >
          {state.stats.totalFlips === 0
            ? 'Press Flip to start the session.'
            : `${state.stats.totalFlips} coins flipped this session.`}
        </span>
        {last ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(last)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-testid="stats-grid">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Heads
          </span>
          <span className="block font-mono text-2xl font-bold" data-testid="stat-heads">
            {state.stats.heads}
          </span>
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="stat-heads-percent"
          >
            {percent === null ? '—' : `${percent.toFixed(1)}%`}
          </span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Tails
          </span>
          <span className="block font-mono text-2xl font-bold" data-testid="stat-tails">
            {state.stats.tails}
          </span>
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="stat-tails-percent"
          >
            {percent === null ? '—' : `${(100 - percent).toFixed(1)}%`}
          </span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Fairness
          </span>
          <span className="block font-mono text-2xl font-bold" data-testid="stat-fairness">
            {fairness === 'unknown' ? '—' : fairness}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="stat-deviation">
            {deviation === null ? 'flip to measure' : `${deviation.toFixed(1)}pp from 50/50`}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Streaks
        </h3>
        <p className="text-xs text-gray-700 dark:text-gray-300" data-testid="streak-info">
          {streak.side === null
            ? 'No streaks yet.'
            : `Current: ${streak.current} × ${streak.side} · Longest: ${streak.longest} × ${streak.longestSide ?? '—'}`}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No flips recorded yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {SIDE_EMOJI[entry.side]} · {entry.count} coin{entry.count === 1 ? '' : 's'} ·{' '}
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
                <CopyButton value={`${entry.side} × ${entry.count}`} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All flips run locally in your browser using cryptographic randomness; nothing is uploaded.
      </p>
    </div>
  );
};
