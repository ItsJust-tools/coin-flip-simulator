# Coin Flip Simulator

Flip one or many virtual coins with streak tracking, cumulative statistics and shareable results. A practical randomness utility for games, decisions and demos.

**Live:** [coin-flip-simulator.itsjust.tools](https://coin-flip-simulator.itsjust.tools)

## Features

- Flip a single coin with an instant heads/tails result
- Choose the batch size (1–100 coins) via presets or a custom number
- Session history of flip events with timestamps, newest first
- Streak tracker showing the current and longest heads/tails run
- Cumulative statistics: total flips, heads/tails counts and percentages
- Fairness indicator comparing the observed split against the expected 50/50
- Copy the session summary to the clipboard (`C`) with toast feedback
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action                    |
| --- | ------------------------- |
| `F` | Flip the configured batch |
| `R` | Reset the session         |
| `C` | Copy the summary          |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-coin-flip-simulator .
docker run -p 3000:3000 itsjust-coin-flip-simulator
```

## License

MIT
