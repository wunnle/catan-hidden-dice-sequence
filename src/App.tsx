import React, { useEffect, useMemo, useState } from "react";

function strToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRngFromSeedString(seedStr: string) {
  const seedFn = strToSeed(seedStr || "default-seed");
  const seed = seedFn();
  return mulberry32(seed);
}

function rollDicePair(rng: () => number): [number, number] {
  const d6 = () => Math.floor(rng() * 6) + 1;
  return [d6(), d6()];
}

async function sha256Hex(str: string) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function App() {
  const [turns, setTurns] = useState<number>(100);
  const [seed, setSeed] = useState<string>(() => Math.random().toString(36).slice(2, 10));
  const [locked, setLocked] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [commitment, setCommitment] = useState<string>("");
  const [hideDistributionNumbers, setHideDistributionNumbers] = useState<boolean>(false);

  const sequence = useMemo<[number, number][]>(() => {
    const rng = makeRngFromSeedString(seed + "|" + turns);
    const arr = Array.from({ length: turns }, () => rollDicePair(rng));
    return arr;
  }, [seed, turns]);

  useEffect(() => {
    const compute = async () => {
      const json = JSON.stringify({ turns, seed, sequence });
      const hex = await sha256Hex(json);
      setCommitment(hex);
    };
    compute();
  }, [sequence, turns, seed]);

  const distribution = useMemo<Record<number, number>>(() => {
    const counts: Record<number, number> = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 2, 0]));
    sequence.forEach(([a, b]) => (counts[a + b] += 1));
    return counts;
  }, [sequence]);

  const revealed = useMemo(() => sequence.slice(0, revealedCount), [sequence, revealedCount]);
  const remaining = sequence.length - revealedCount;
  const lastRoll = revealed.length ? revealed[revealed.length - 1] : null;

  function handleStartGame() {
    setLocked(true);
    setRevealedCount(0);
  }

  function handleNextRoll() {
    if (!locked) return;
    if (revealedCount < sequence.length) {
      setRevealedCount((c) => c + 1);
    }
  }

  function handleReset() {
    setLocked(false);
    setRevealedCount(0);
    setSeed(Math.random().toString(36).slice(2, 10));
  }

  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Catan Variant: Hidden Pre-Generated Dice</h1>
          <button className="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm" onClick={handleReset}>New Setup</button>
        </header>

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm mb-1">Turns</label>
              <input type="number" min={1} max={500} value={turns}
                onChange={(e) => setTurns(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
                disabled={locked} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Seed</label>
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} disabled={locked} className="w-full rounded-xl border px-3 py-2 font-mono" />
            </div>
            <div className="flex gap-2 items-center">
              <button className={`flex-1 px-4 py-2 rounded-xl text-white ${locked ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
                onClick={handleStartGame} disabled={locked}>Start Game</button>
              <button className="px-4 py-2 rounded-xl border" onClick={() => { if (!locked) setSeed(Math.random().toString(36).slice(2, 10)); }} disabled={locked}>Randomize Seed</button>
            </div>
          </div>

          <div className="mt-4 text-sm">
            <div><span className="font-medium">Sequence commitment (SHA-256):</span> <span className="font-mono break-all">{commitment}</span></div>
            <p className="text-gray-600 mt-1">Share this code with all players before starting. After the game, reveal the seed and sequence to verify fairness.</p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Visible Distribution</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" checked={hideDistributionNumbers}
                onChange={(e) => setHideDistributionNumbers(e.target.checked)} />
              Hide counts
            </label>
          </div>
          <div className="grid grid-cols-11 gap-2 items-end">
            {Object.entries(distribution).map(([sumStr, count]) => {
              const sum = Number(sumStr);
              const pct = turns ? Math.round((count / turns) * 100) : 0;
              const h = maxCount ? Math.max(8, Math.round((count / maxCount) * 120)) : 8;
              return (
                <div key={sum} className="flex flex-col items-center gap-1">
                  <div className={`w-full rounded-t-md ${hideDistributionNumbers ? "bg-blue-400" : "bg-blue-500"}`} style={{ height: h }}
                    title={hideDistributionNumbers ? "" : `${sum}: ${count} (${pct}%)`} />
                  <div className="text-xs font-mono">{sum}</div>
                  {!hideDistributionNumbers && (<div className="text-[10px] text-gray-600">{count}</div>)}
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Play</h2>

          <div className="mb-4">
            {lastRoll ? (
              <div className="rounded-2xl border bg-gray-50 p-4 flex items-center justify-between shadow-sm">
                <div className="text-sm text-gray-600">Last roll</div>
                <div className="text-5xl font-bold tracking-wide">
                  {lastRoll[0]} + {lastRoll[1]} = {lastRoll[0] + lastRoll[1]}
                </div>
                <div className="text-xs text-gray-500">#{revealedCount}</div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
                Press <span className="font-medium">Roll</span> to reveal the first dice.
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleNextRoll} disabled={!locked || remaining === 0}
              className={`px-4 py-2 rounded-xl text-white ${remaining === 0 || !locked ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
              Roll
            </button>
            <div className="text-sm text-gray-700">
              Revealed: <span className="font-medium">{revealedCount}</span> / {turns} · Remaining: <span className="font-medium">{remaining}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Recent Rolls</div>
            <div className="flex flex-wrap gap-2">
              {revealed.slice(-15).map(([a, b], i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-gray-100 font-mono">{a} + {b} = {a + b}</span>
              ))}
              {revealed.length === 0 && <span className="text-gray-500 text-sm">(none yet)</span>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
