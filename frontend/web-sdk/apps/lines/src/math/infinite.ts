// src/math/infinite.ts
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export interface QuoteReq {
  amount: number;
  difficulty: Difficulty;
}

export interface Quote {
  // Erwartungswert (Multiplikator & Payout) für Info/Anzeige
  evMultiplier: number;
  expectedPayout: number;
  // Für UI: normalisierte Tabelle (p = Wahrscheinlichkeit 0..1)
  table: Array<{ m: number; p: number;}>;
}

export interface PlayReq {
  amount: number;
  difficulty: Difficulty;
}

export interface PlayResult {
  multiplier: number;           // gezogener Multiplikator
  payout: number;               // amount * multiplier (gerundet)
  index: number;                // Index im Table (für Farbpunkte etc.)
  win: boolean;                 // simple Regel: m >= 1 => "win"
}

/* -------------------------------------------------------- */
/* Tabellen: Multiplikator + Gewicht (w). Farben optional — */
/* Reihenfolge = Anzeige-Reihenfolge in deinem Mockup.      */
/* -------------------------------------------------------- */

type Row = { m: number; w: number; color?: string };

const tablesWeighted: Record<Difficulty, Row[]> = {
  Easy: [
    { m: 10,   w: 0.003,}, // gelb
    { m: 3,    w: 0.015,}, // orange
    { m: 2,    w: 0.050,}, // grün
    { m: 1.3,  w: 0.160,}, // blau
    { m: 1.1,  w: 0.250,}, // rot
    { m: 0.8,  w: 0.230,}, // braun
    { m: 0.5,  w: 0.292,}, // grau
  ],
  Medium: [
    { m: 100,  w: 0.0005,},
    { m: 20,   w: 0.0030,},
    { m: 10,   w: 0.0100,},
    { m: 3,    w: 0.0600,},
    { m: 1.5,  w: 0.2000,},
    { m: 0.5,  w: 0.3600,},
    { m: 0.3,  w: 0.3665,},
  ],
  Hard: [
    { m: 1000, w: 0.0001,},
    { m: 100,  w: 0.0008,},
    { m: 20,   w: 0.0040,},
    { m: 10,   w: 0.0100,},
    { m: 4,    w: 0.0400,},
    { m: 2,    w: 0.1400,},
    { m: 0.2,  w: 0.8051,},
  ],
  Extreme: [
    { m: 10000, w: 0.0001,},
    { m: 1000,  w: 0.0008,},
    { m: 100,   w: 0.0040,},
    { m: 10,   w: 0.0100,},
    { m: 0.5,    w: 0.0400,},
    { m: 0.3,    w: 0.1400,},
    { m: 0.1,  w: 0.8051,},
  ],
};

/* Die obigen Gewichte sind so gewählt, dass der EV grob bei:
   Easy ~0.99x, Medium ~0.98x, Hard ~0.96x liegt. Tweake nach Bedarf. */

/* --------------------- Utilities --------------------- */

function normalizeTable(rows: Row[]) {
  const sum = rows.reduce((s, r) => s + r.w, 0) || 1;
  return rows.map(r => ({ m: r.m, p: r.w / sum, color: r.color }));
}

function rng(): number {
  // später durch provably-fair RNG ersetzbar
  return Math.random();
}

/* ----------------------- API ------------------------- */

export function quote(req: QuoteReq): Quote {
  const table = normalizeTable(tablesWeighted[req.difficulty]);
  const evMultiplier = table.reduce((s, r) => s + r.m * r.p, 0);
  const expectedPayout = Math.floor(req.amount * evMultiplier);
  return { evMultiplier, expectedPayout, table };
}

export async function play(req: PlayReq): Promise<PlayResult> {
  const table = normalizeTable(tablesWeighted[req.difficulty]);

  // gewichtete Auswahl
  const r = rng();
  let acc = 0;
  let idx = 0;
  for (; idx < table.length; idx++) {
    acc += table[idx].p;
    if (r <= acc) break;
  }
  const chosen = table[Math.min(idx, table.length - 1)];
  const payout = Math.floor(req.amount * chosen.m);
  const win = chosen.m >= 1;

  return { multiplier: chosen.m, payout, index: idx, win };
}

/* Für UI-Listings/Farblegende */
export function getTable(difficulty: Difficulty) {
  return normalizeTable(tablesWeighted[difficulty]);
}

export function sampleMultiplier(difficulty: Difficulty): number {
  const table = getTable(difficulty); // normalisiert
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < table.length; i++) {
    acc += table[i].p;
    if (r <= acc) return table[i].m;
  }
  return table[table.length - 1].m;
}
