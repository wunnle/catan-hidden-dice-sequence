# Catan — Hidden Pre‑Generated Dice

A tiny web app for a Catan variant where all dice results are pre‑generated and hidden. Players see the distribution for N turns to inform initial placement, then press **Roll** each turn to reveal the next result.

## Features
- Seeded RNG with a **commitment hash** (SHA‑256) to prove fairness after the game.
- Shows distribution (2–12) for the full sequence; **toggle to hide counts**.
- Reveals **two dice** per roll (e.g., `3 + 5 = 8`) and highlights the **latest roll**.
- Lock seed/turns with **Start Game**, then reveal rolls one by one.

## Stack
- Vite + React + TypeScript
- Tailwind CSS

## Getting Started
```bash
npm install
npm run dev
# open the URL printed by Vite (usually http://localhost:5173)
```

## Build
```bash
npm run build
npm run preview
```

## Verifying Fairness
- Before starting, share the **SHA‑256 commitment** from the UI with all players.
- After the game, reveal the `seed`, `turns`, and the generated sequence (the app already knows these).
- Anyone can re‑compute the hash of `JSON.stringify({ turns, seed, sequence })` and compare.

## Deploy
- Deploy the built `dist/` to Netlify, GitHub Pages, or Vercel.

## License
MIT
