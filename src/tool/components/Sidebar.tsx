'use client';

import React from 'react';
import { computeStreak, headsPercent, clampBatch, type ToolState } from '../types';
import { FLIP_OPTIONS } from '../ui-shared';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const percent = headsPercent(state.stats);
  const streak = computeStreak(state.history);
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="coin-flip-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Batch presets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {FLIP_OPTIONS.map((opt) => (
            <li key={opt.value} className="flex justify-between gap-2">
              <span>Flip {opt.label}</span>
              {state.batchCount === opt.value ? (
                <span className="text-emerald-600 dark:text-emerald-400">selected</span>
              ) : null}
            </li>
          ))}
        </ul>
        <label className="mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Custom batch size
          <input
            type="number"
            min={1}
            max={100}
            value={state.batchCount}
            onChange={(e) => onChange({ ...state, batchCount: clampBatch(Number(e.target.value)) })}
            data-testid="sidebar-batch-input"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Session summary</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-summary">
          {percent === null
            ? 'No flips yet.'
            : `${state.stats.totalFlips} flips · ${percent.toFixed(1)}% heads · ${state.history.length} recorded event${state.history.length === 1 ? '' : 's'}`}
        </p>
        {streak.side !== null ? (
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-streak">
            Longest streak: {streak.longest} × {streak.longestSide}
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>F</kbd> — flip {state.batchCount} coin{state.batchCount === 1 ? '' : 's'}
          </li>
          <li>
            <kbd>R</kbd> — reset session
          </li>
          <li>
            <kbd>C</kbd> — copy summary
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current session; open it to
          restore your history and statistics.
        </p>
      </div>
    </div>
  );
};
