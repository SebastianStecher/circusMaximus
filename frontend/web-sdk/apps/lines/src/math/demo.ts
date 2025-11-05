import type { Difficulty, QuoteReq, Quote, PlayReq, PlayResult } from './types';

// Platzhalter-Tabellen (kannst du nach Geschmack tweaken)
const tables = {
  Easy: {
    multipliers: [1.05, 1.10, 1.15, 1.20, 1.28, 1.36, 1.45, 1.55, 1.70, 1.90],
    winProbs:    [0.80, 0.78, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40]
    //winProbs:    [1,1,1,1,1,1,1,1,1,1]
  },
  Medium: {
    multipliers: [1.10, 1.18, 1.28, 1.40, 1.55, 1.70, 1.90, 2.20, 2.60, 3.00],
    winProbs:    [0.65, 0.62, 0.58, 0.52, 0.46, 0.40, 0.34, 0.28, 0.24, 0.20]
  },
  Hard: {
    multipliers: [1.15, 1.30, 1.50, 1.75, 2.05, 2.40, 2.80, 3.25, 3.60, 4.00],
    winProbs:    [0.50, 0.45, 0.38, 0.32, 0.26, 0.22, 0.18, 0.15, 0.13, 0.10]
  }
} as const;


const clampIndex = (len: number, streak: number) =>
  Math.min(streak, len - 1);

export const quote = (req: QuoteReq): Quote => {
  const t = tables[req.difficulty as keyof typeof tables];
  const idx = clampIndex(t.multipliers.length, req.streak);
  const m = t.multipliers[idx];
  const p = t.winProbs[idx];
  return { step: idx + 1, multiplier: m, winProb: p, payout: Math.floor(req.amount * m) };
};

// Einfaches RNG für die Demo
function rng(): number {
  return Math.random(); // später durch provably-fair ersetzen
}

export async function play(req: PlayReq): Promise<PlayResult> {
  const q = quote(req);
  const roll = rng();
  const win = roll < q.winProb;
  return win
    ? { win, payout: q.payout, newStreak: req.streak + 1, step: q.step, multiplier: q.multiplier }
    : { win, payout: 0,        newStreak: 0,                step: q.step, multiplier: q.multiplier };
}
