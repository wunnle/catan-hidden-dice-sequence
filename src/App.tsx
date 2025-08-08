import React, { useEffect, useMemo, useState, useRef } from "react";

// -------- RNG helpers --------
function strToSeed(str: string): () => number {
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
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRngFromSeedString(seedStr: string): () => number {
  const seedFn = strToSeed(seedStr || "default-seed");
  const seed = seedFn();
  return mulberry32(seed);
}
function rollDicePair(rng: () => number): [number, number] {
  const d6 = () => Math.floor(rng() * 6) + 1;
  return [d6(), d6()];
}

// -------- 3D CSS Dice (JSX) with pip padding + moderate randomized rotation --------
function DiceCSS({ value, size = 96, pop = false }: { value: number; size?: number; pop?: boolean }) {
  const styleTagId = "dice-css-classes";
  const [tf, setTf] = useState<string>("");

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById(styleTagId)) return;
    const css = `
      .dice-wrap { display:inline-block; }
      .dice-wrap.pop { animation: pop 160ms ease-out; }
      @keyframes pop { 0% { transform: scale(0.96);} 80% { transform: scale(1.04);} 100% { transform: scale(1);} }

      .dice { position: relative; width: var(--size); height: var(--size); transform-style: preserve-3d; transition: transform 1100ms cubic-bezier(0.2,0.8,0.2,1); }
      .side { position: absolute; width: var(--size); height: var(--size); background:#fff; display:grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr); align-items:center; justify-items:center; backface-visibility:hidden; padding:10%; box-sizing:border-box; }
      .dot { width: calc(var(--size) * 0.14); height: calc(var(--size) * 0.14); border-radius:9999px; background:#f25f5c; box-shadow: inset 2px 2px #d90429; }
      /* Faces order: 1=front, 2=back, 3=right, 4=left, 5=top, 6=bottom */
      .side:nth-child(1) { transform: translateZ(var(--half)); }
      .side:nth-child(2) { transform: rotateY(180deg) translateZ(var(--half)); }
      .side:nth-child(3) { transform: rotateY(-90deg) translateZ(var(--half)); }
      .side:nth-child(4) { transform: rotateY(90deg) translateZ(var(--half)); }
      .side:nth-child(5) { transform: rotateX(-90deg) translateZ(var(--half)); }
      .side:nth-child(6) { transform: rotateX(90deg) translateZ(var(--half)); }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = styleTagId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }, []);

  // Map face -> base orientation that brings that face to the FRONT
  const baseFor = (v: number) => {
    switch (v) {
      case 1: return { rx: 0,  ry: 0  };
      case 2: return { rx: 0,  ry: 180};
      case 3: return { rx: 0,  ry: 90 };
      case 4: return { rx: 0,  ry: -90};
      case 5: return { rx: 90, ry: 0  };
      case 6: return { rx: -90,ry: 0  };
      default: return { rx: 0, ry: 0 };
    }
  };

  // Guarantee moderate, varied spin (2–4 turns, random directions) to land on face
  useEffect(() => {
    const v = Math.min(6, Math.max(1, value || 1));
    const base = baseFor(v);
    const spinsX = 360 * (Math.floor(Math.random() * 3) + 2); // 720–1440°
    const spinsY = 360 * (Math.floor(Math.random() * 3) + 2);
    const sgnX = Math.random() < 0.5 ? -1 : 1;
    const sgnY = Math.random() < 0.5 ? -1 : 1;
    setTf(`rotateX(${base.rx + sgnX * spinsX}deg) rotateY(${base.ry + sgnY * spinsY}deg)`);
  }, [value]);

  const className = "dice";
  const style = { ["--size" as any]: `${size}px`, ["--half" as any]: `${size / 2}px`, transform: tf } as React.CSSProperties;

  const pipGrid = (indices: number[]) => {
    const set = new Set(indices);
    return Array.from({ length: 9 }, (_, i) => (
      <div key={i} className="w-full h-full grid place-items-center">{set.has(i) ? <div className="dot" /> : null}</div>
    ));
  };

  return (
    <div className={`dice-wrap ${pop ? "pop" : ""}`}>
      <div className={className} style={style}>
        <div className="side">{pipGrid([4])}</div>
        <div className="side">{pipGrid([0, 8])}</div>
        <div className="side">{pipGrid([0, 4, 8])}</div>
        <div className="side">{pipGrid([0, 2, 6, 8])}</div>
        <div className="side">{pipGrid([0, 2, 4, 6, 8])}</div>
        <div className="side">{pipGrid([0, 2, 3, 5, 6, 8])}</div>
      </div>
    </div>
  );
}

export default function PreGeneratedCatanDice() {
  const [turns, setTurns] = useState<number>(100);
  const [seed, setSeed] = useState<string>(() => Math.random().toString(36).slice(2, 10));
  const [locked, setLocked] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [showCounts, setShowCounts] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [popKey, setPopKey] = useState<number>(0);
  const [displayFaces, setDisplayFaces] = useState<[number, number] | null>(null);

  // Pre-generate full sequence
  const sequence = useMemo<[number, number][]>(() => {
    const rng = makeRngFromSeedString(seed + "|" + turns);
    return Array.from({ length: turns }, () => rollDicePair(rng));
  }, [seed, turns]);

  // Distribution 2..12
  const distribution = useMemo<Record<number, number>>(() => {
    const counts: Record<number, number> = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 2, 0]));
    sequence.forEach(([a, b]) => (counts[a + b] += 1));
    return counts;
  }, [sequence]);
  const maxCount = Math.max(...Object.values(distribution));

  useEffect(() => { if (!displayFaces) setDisplayFaces([1, 1]); }, [displayFaces]);

  const remaining = sequence.length - revealedCount;
  const lastRoll = revealedCount > 0 ? sequence[revealedCount - 1] : null;

  function handleStartGame() {
    setLocked(true);
    setRevealedCount(0);
  }

  function handleNextRoll() {
    if (!locked || isRolling || remaining <= 0) return;
    setIsRolling(true);

    const target = sequence[revealedCount];
    const current = displayFaces || [1, 1];

    // If a die wouldn't visibly turn (same face), insert a different temporary face first
    const mid: [number, number] = [
      current[0] === target[0] ? ((target[0] % 6) + 1) : target[0],
      current[1] === target[1] ? ((target[1] % 6) + 1) : target[1],
    ];

    if (mid[0] !== target[0] || mid[1] !== target[1]) {
      setDisplayFaces(mid);
      setTimeout(() => setDisplayFaces(target), 40);
    } else {
      setDisplayFaces(target);
    }

    // After transition ends (~1.1s), commit roll and trigger pop
    setTimeout(() => {
      setIsRolling(false);
      setPopKey((k) => k + 1);
      setRevealedCount((c) => c + 1);
    }, 1120);
  }

  function handleReset() {
    setLocked(false);
    setRevealedCount(0);
    setIsRolling(false);
    setPopKey(0);
    setSeed(Math.random().toString(36).slice(2, 10));
    setDisplayFaces([1, 1]);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Catan Variant: Hidden Pre‑Generated Dice</h1>
          <div className="flex gap-2 items-center">
            {!locked && (
              <button onClick={handleStartGame} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 text-sm">Start Game</button>
            )}
            {!locked && (
              <button onClick={() => { setSeed(Math.random().toString(36).slice(2, 10)); setRevealedCount(0); setDisplayFaces([1,1]); }} className="px-3 py-2 border text-sm">Randomize Seed</button>
            )}
            <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-sm" onClick={handleReset}>New Setup</button>
          </div>
        </header>

        {/* Setup (hidden after start) */}
        {!locked && (
          <section className="p-4 bg-white">
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm mb-1">Turns</label>
                <input type="number" min={1} max={500} value={turns} onChange={(e) => setTurns(Math.max(1, Math.min(500, Number(e.target.value) || 0)))} className="w-full border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Seed</label>
                <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-full border px-3 py-2 font-mono" />
              </div>
              <div className="text-sm text-gray-600 self-end">Use the distribution below for placement. Press <span className="font-medium">Start Game</span> when ready.</div>
            </div>
          </section>
        )}

        {/* Distribution */}
        <section className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Visible Distribution</h2>
            <label className="flex items-center gap-2 text-sm select-none">
              <input type="checkbox" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} />
              Show counts
            </label>
          </div>
          <div className="grid grid-cols-11 gap-2 items-end">
            {Object.entries(distribution).map(([sum, count]) => {
              const h = Math.max(8, Math.round((count / (maxCount || 1)) * 120));
              return (
                <div key={sum} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-blue-500" style={{ height: h }} />
                  <div className="text-xs font-mono">{sum}</div>
                  {showCounts && <div className="text-[10px] text-gray-600">{count}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Play area */}
        <section className="p-6" style={{ backgroundColor: "#70c1b3" }}>
          <div className="flex items-center justify-between mb-3 text-white/90">
            <div>Turns: {turns}</div>
            <div>Revealed: <span className="font-semibold">{revealedCount}</span> / {sequence.length} · Remaining: <span className="font-semibold">{sequence.length - revealedCount}</span></div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              {displayFaces && (
                <>
                  <DiceCSS value={displayFaces[0]} size={96} pop={popKey % 2 === 1} />
                  <DiceCSS value={displayFaces[1]} size={96} pop={popKey % 2 === 1} />
                  <div className="text-4xl font-bold text-white whitespace-nowrap">= {displayFaces[0] + displayFaces[1]}</div>
                </>
              )}
            </div>
            <div className="w-full md:w-auto">
              <button
                onClick={handleNextRoll}
                disabled={!locked || isRolling || remaining <= 0}
                className={`w-full md:w-auto relative top-0 left-0 px-6 py-4 text-2xl text-white transition duration-300 ${(!locked || isRolling || remaining <= 0) ? 'bg-gray-400' : ''}`}
                style={!(!locked || isRolling || remaining <= 0) ? { backgroundColor: '#f4d35e', boxShadow: '1px 3px #50514F' } as React.CSSProperties : undefined}
                onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(15px)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#50514F'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f4d35e'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f4d35e'; }}
              >
                {isRolling ? 'Rolling…' : remaining <= 0 ? 'Done' : 'Roll'}
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-white/90">
            {lastRoll ? (
              <>Last roll: {lastRoll[0]} + {lastRoll[1]} = {lastRoll[0] + lastRoll[1]}</>
            ) : (
              <>Press <span className="font-semibold">Start Game</span> then <span className="font-semibold">Roll</span> to begin.</>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
