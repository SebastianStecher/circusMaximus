// placements.ts
import type { Difficulty } from './types';

export type Place = 1 | 2 | 3 | 4 | 'DNF';

type PlaceBuckets = {
  P1: number[];
  P2: number[];
  P3: number[];
  P4: number[];
  DNF: number[]; // normalerweise nur [0]
};

export const MULTIPLIER_TABLE: Record<Difficulty, PlaceBuckets> = {
  Easy: {
    P1: [10, 7.5, 4],
    P2: [6, 3, 1.5],
    P3: [2, 1.4, 0.4],
    P4: [0.5, 0.45, 0.2],
    DNF: [0],
  },
  Medium: {
    P1: [100, 25, 8],
    P2: [10, 5, 3.5],
    P3: [4.5, 2, 0.45],
    P4: [0.5, 0.3, 0.1],
    DNF: [0],
  },
  Hard: {
    P1: [1000, 30, 10],
    P2: [12, 7.5, 3],
    P3: [4, 1.8, 0.3],
    P4: [0.4, 0.2, 0.1],
    DNF: [0],
  },
  Extreme: {
    P1: [15000, 100, 20],
    P2: [25, 10, 6],
    P3: [7.5, 3, 0.19],
    P4: [0.3, 0.2, 0.1],
    DNF: [0],
  },
};

// Toleranz für Float-Vergleiche
const EPS = 1e-9;
const eq = (a: number, b: number, eps = EPS) => Math.abs(a - b) <= eps;

/** Platz (1–4) oder "DNF" zu einem Multiplikator ermitteln */
export function getPlace(
  difficulty: Difficulty,
  multiplier: number,
  eps = EPS
): Place | null {
  const bucket = MULTIPLIER_TABLE[difficulty];
  if (!bucket) return null;

  if (bucket.P1.some((m) => eq(m, multiplier, eps))) return 1;
  if (bucket.P2.some((m) => eq(m, multiplier, eps))) return 2;
  if (bucket.P3.some((m) => eq(m, multiplier, eps))) return 3;
  if (bucket.P4.some((m) => eq(m, multiplier, eps))) return 4;
  if (bucket.DNF.some((m) => eq(m, multiplier, eps))) return 'DNF';

  return null; // Multiplikator kommt in dieser Difficulty nicht vor
}

/** Optional: alle passenden Plätze (ohne Priorisierung) */
export function getAllMatchingPlaces(
  difficulty: Difficulty,
  multiplier: number,
  eps = EPS
): Place[] {
  const bucket = MULTIPLIER_TABLE[difficulty];
  if (!bucket) return [];

  const out: Place[] = [];
  if (bucket.P1.some((m) => eq(m, multiplier, eps))) out.push(1);
  if (bucket.P2.some((m) => eq(m, multiplier, eps))) out.push(2);
  if (bucket.P3.some((m) => eq(m, multiplier, eps))) out.push(3);
  if (bucket.P4.some((m) => eq(m, multiplier, eps))) out.push(4);
  if (bucket.DNF.some((m) => eq(m, multiplier, eps))) out.push('DNF');
  return out;
}
// --- Helpers: Multiplikator-Listen & Random-Pick ---

export type RandomOpts = {
  /** Nur diese Plätze berücksichtigen (1–4). DNF wird separat über includeDNF gesteuert. */
  places?: Array<1 | 2 | 3 | 4>;
  /** DNF (0x) einschließen? Default: true */
  includeDNF?: boolean;
  /** Eigenes RNG (z.B. seedbar): soll 0 <= r < 1 liefern. Default: Math.random */
  rng?: () => number;
};

/** Liefert alle eindeutigen Multiplikatoren für die Difficulty gemäß Optionen. */
export function getAllMultipliers(
  difficulty: Difficulty,
  opts: RandomOpts = {}
): number[] {
  const { places, includeDNF = true } = opts;
  const b = MULTIPLIER_TABLE[difficulty];
  if (!b) return [];

  const buckets: number[][] = [];

  const want = (p: 1 | 2 | 3 | 4) => !places || places.includes(p);

  if (want(1)) buckets.push(b.P1);
  if (want(2)) buckets.push(b.P2);
  if (want(3)) buckets.push(b.P3);
  if (want(4)) buckets.push(b.P4);
  if (includeDNF) buckets.push(b.DNF);

  // Eindeutig machen (zur Sicherheit) und als neues Array zurückgeben
  const set = new Set<number>();
  for (const arr of buckets) for (const m of arr) set.add(m);
  return Array.from(set.values());
}

/** Zieht uniform zufällig einen Multiplikator aus der Difficulty (gemäß Optionen). */
export function getRandomMultiplier(
  difficulty: Difficulty,
  opts: RandomOpts = {}
): number | null {
  const { rng = Math.random } = opts;
  const list = getAllMultipliers(difficulty, opts);
  if (list.length === 0) return null;
  const idx = Math.floor(rng() * list.length);
  return list[idx];
}
// ---- Anzeige-Helfer für DisplayBoard ----

type FormatOpts = {
  /** 'auto' lässt Nachkommastellen wie im Input; oder z.B. 2 für fix 2 Dezimalen */
  decimals?: 'auto' | number;
  /** Trennzeichen zwischen Multiplikatoren */
  sep?: string;
  /** Suffix (standard: 'x') */
  suffix?: string;
};

const defaultFormat: Required<FormatOpts> = {
  decimals: 'auto',
  sep: ' | ',
  suffix: 'x',
};

function fmtNum(n: number, decimals: 'auto' | number): string {
  if (decimals === 'auto') {
    // trim trailing zeros ohne zu runden
    const s = String(n);
    // Falls der Wert bereits als Ganzzahl vorliegt, bleibt er so
    if (Number.isInteger(n)) return s;
    // Andernfalls Nachkommastellen belassen (z.B. 1.4, 0.19)
    return s;
  }
  // fixierte Dezimalen, danach trailing zeros + evtl. Punkt weg
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

function fmtRow(label: string, arr: number[], opts?: FormatOpts): string {
  const { decimals, sep, suffix } = { ...defaultFormat, ...opts };
  const inner = arr.map((m) => `${fmtNum(m, decimals)}${suffix}`).join(sep);
  return `${label}: ${inner}`;
}

/** Baut die 5 Textzeilen (P1..P4, DNF) für eine Difficulty. */
export function asLinesFromTable(
  difficulty: Difficulty,
  opts?: FormatOpts
): string[] {
  const b = MULTIPLIER_TABLE[difficulty];
  return [
    fmtRow('P1', b.P1, opts),
    fmtRow('P2', b.P2, opts),
    fmtRow('P3', b.P3, opts),
    fmtRow('P4', b.P4, opts),
    fmtRow('DNF', b.DNF, opts),
  ];
}

/** Baut die Map für alle Difficulties – ideal zum direkten Binden an DisplayBoard. */
export function buildLinesByDifficulty(
  opts?: FormatOpts
): Record<Difficulty, string[]> {
  return {
    Easy: asLinesFromTable('Easy', opts),
    Medium: asLinesFromTable('Medium', opts),
    Hard: asLinesFromTable('Hard', opts),
    Extreme: asLinesFromTable('Extreme', opts),
  };
}
