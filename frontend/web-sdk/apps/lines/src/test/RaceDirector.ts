// RaceDirector.ts — Dramatic Storyline + Guaranteed Finish Order (ballistic lock by finish TIMES)

export type Pt = { x: number; y: number };
export type Outcome = 1 | 2 | 3 | 4 | 'DNF';

type SetSpeedsFn  = (v: number[]) => void;
type GetProgressFn = () => number[];
type Ease = (t: number) => number;

const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

const easeInOutCubic: Ease = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / Math.max(1e-6, (e1 - e0)), 0, 1);
  return t * t * (3 - 2 * t);
};

// --- RNG ---------------------------------------------------------------------
function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0);
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rr = (rng: () => number, a: number, b: number) => a + (b - a) * rng();

// --- Geometry/Equalization ---------------------------------------------------
export function laneLength(pts: Pt[]): number {
  if (!pts || pts.length < 2) return 0;
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    L += Math.hypot(dx, dy);
  }
  return L;
}

function equalizedSpeedsFromLanes(
  lanes: Pt[][],
  baseSpeed: number,
  ref: { index: number } | 'avg' = 'avg'
): number[] {
  const lengths = lanes.map(laneLength);
  const Lref = ref === 'avg'
    ? lengths.reduce((a,b)=>a+b,0) / Math.max(1, lengths.length)
    : lengths[Math.max(0, Math.min((ref as any).index|0, lengths.length - 1))];
  const eps = 1e-9;
  const refLen = Math.max(Lref, eps);
  return lengths.map(Li => baseSpeed * (Li / refLen));
}

// --- Gap generator (seconds to winner, strictly increasing) ------------------
function makeFinishGaps(placeOfPlayer: Outcome, rng: () => number, gapScale = 1.0): number[] {
  let g2 = rr(rng, 0.28, 0.55);
  let g3 = g2 + rr(rng, 0.50, 0.80);
  let g4 = g3 + rr(rng, 0.70, 1.10);
  switch (placeOfPlayer) {
    case 1: g2 = rr(rng, 0.30, 0.60); g3 = g2 + rr(rng, 0.55, 0.90); g4 = g3 + rr(rng, 0.80, 1.30); break;
    case 2: g2 = rr(rng, 0.25, 0.50); g3 = g2 + rr(rng, 0.60, 0.95); g4 = g3 + rr(rng, 0.80, 1.20); break;
    case 3: g2 = rr(rng, 0.35, 0.65); g3 = g2 + rr(rng, 0.45, 0.80); g4 = g3 + rr(rng, 0.80, 1.25); break;
    case 4: g2 = rr(rng, 0.40, 0.75); g3 = g2 + rr(rng, 0.60, 0.95); g4 = g3 + rr(rng, 0.90, 1.40); break;
    case 'DNF': g2 = rr(rng, 0.35, 0.70); g3 = g2 + rr(rng, 0.60, 0.95); g4 = g3 + rr(rng, 0.85, 1.30); break;
  }
  g2 *= gapScale; g3 *= gapScale; g4 *= gapScale;
  g2 = Math.max(0.05, g2);
  g3 = Math.max(g2 + 0.05, g3);
  g4 = Math.max(g3 + 0.05, g4);
  return [0, g2, g3, g4];
}

// --- Options -----------------------------------------------------------------
export interface RaceDirectorOpts {
  lanes: Pt[][];
  totalLength: number;                 // centerline (informative)
  baseSpeed: number;
  playerIndex: number;                 // 0..3
  seed: string;

  roundDurationSec?: number;
  kCorrection?: number;
  corrMaxFrac?: number;
  phaseBoosts?: { start: number; mid: number; final: number };
  noiseFrac?: number;
  beatsCount?: number;
  beatsSpan?: [number, number];

  drama?: {
    gapScale?: number;                 // scales finish gaps
    spreadEarly?: [number, number];    // early variation vs final gaps
    spreadMid?: [number, number];      // mid variation vs final gaps
    swapsMin?: number;
    swapsMax?: number;
    comebackChance?: number;
    anchors?: number[];
  };
}

type Beat = { u0: number; u1: number; who: number; amp: number };

// --- Result/Finish Promise ---------------------------------------------------
export type RaceResult = {
  order: number[];              // pos->car index (0..3), winner is order[0]
  tFinish: number[];            // absolute finish times per car (s since start)
  dnfIndex: number | null;      // index of DNF car, if any
  playerPlace: 1|2|3|4|'DNF';   // player's place or 'DNF'
};

// --- Director ----------------------------------------------------------------
export class RaceDirector {
  private lanes: Pt[][];
  private laneLens: number[];
  private totalLength: number;
  private baseSpeed: number;
  private playerIndex: number;
  private rng: () => number;

  private setSpeeds: SetSpeedsFn = () => {};
  private getProgress: GetProgressFn = () => [0,0,0,0];

  private vEq: number[] = [0,0,0,0];
  private vNow: number[] = [0,0,0,0];

  // final finishing order (pos->car) & gaps (sec to winner)
  private orderFinal: number[] = [0,1,2,3];
  private finishGapsSec: number[] = [0, 0.35, 1.0, 2.0];

  // absolute finish times per car (seconds since start) + optional DNF cut
  private tFinish: number[] = [0,0,0,0];
  private sCut: number | null = null;

  private dnfIndex: number | null = null;
  private dnfCutU: number = 0.72;

  private T: number;
  private k: number;
  private corrMaxFrac: number;
  private phaseBoosts: { start: number; mid: number; final: number };
  private noiseFrac: number;

  private beats: Beat[] = [];
  private t = 0;
  private raf: number | null = null;

  // drama options
  private gapScale: number;
  private spreadEarly: [number, number];
  private spreadMid: [number, number];

  // lock & convergence parameters
  private readonly uConvStart = 0.70;
  private readonly uLockStart = 0.86;
  private readonly uKillChaos = 0.90;

  // finish promise state
  private finished = false;
  private finishResolve: ((r: RaceResult) => void) | null = null;
  private finishPromise: Promise<RaceResult> | null = null;

  // watchdog
  private watchdogId: number | null = null;

  // only used for lock-phase counting; do NOT gate resolution on this
  private finishedCount = 0;

  constructor(opts: RaceDirectorOpts) {
    this.lanes        = opts.lanes;
    this.laneLens     = this.lanes.map(laneLength);
    this.totalLength  = opts.totalLength;
    this.baseSpeed    = opts.baseSpeed;
    this.playerIndex  = Math.max(0, Math.min(opts.playerIndex|0, 3));
    this.rng          = mulberry32(hashString(opts.seed));

    // Equalize to player lane (outer lane fairness)
    this.vEq = equalizedSpeedsFromLanes(this.lanes, this.baseSpeed, { index: this.playerIndex });

    // Round time from mean lane length / mean vEq
    const vMean = this.vEq.reduce((a,b)=>a+b,0) / Math.max(1, this.vEq.length);
    const Lmean = this.laneLens.reduce((a,b)=>a+b,0) / Math.max(1, this.laneLens.length);
    const safeLen = Math.max(1e-6, Lmean);
    const safeV   = Math.max(1e-6, vMean);
    this.T = opts.roundDurationSec ?? (safeLen / safeV);

    this.k            = opts.kCorrection ?? (0.6 / this.T);
    this.corrMaxFrac  = opts.corrMaxFrac ?? 0.12;
    this.phaseBoosts  = opts.phaseBoosts ?? { start: 1.12, mid: 1.00, final: 1.05 };
    this.noiseFrac    = opts.noiseFrac ?? 0.008;

    const count = opts.beatsCount ?? 4;
    const span  = opts.beatsSpan ?? [0.12, 0.88];
    this.beats  = this.makeBeats(count, span);

    // drama
    this.gapScale    = opts.drama?.gapScale    ?? 1.15;
    this.spreadEarly = opts.drama?.spreadEarly ?? [0.5, 0.9];
    this.spreadMid   = opts.drama?.spreadMid   ?? [0.8, 1.1];

    // default, will be overwritten before start
    this.setOutcome(2);
  }

  // --- finish promise API ----------------------------------------------------
  waitForFinish(): Promise<RaceResult> {
    if (this.finished) return Promise.resolve(this.buildResult());
    if (!this.finishPromise) {
      this.finishPromise = new Promise<RaceResult>((res) => { this.finishResolve = res; });
    }
    return this.finishPromise;
  }

  private buildResult(): RaceResult {
    const playerPos = this.orderFinal.findIndex(c => c === this.playerIndex);
    const playerPlace = (this.dnfIndex === this.playerIndex)
      ? 'DNF'
      : ((playerPos >= 0 ? (playerPos + 1) : 4) as 1|2|3|4);
    return {
      order: this.orderFinal.slice(),
      tFinish: this.tFinish.slice(),
      dnfIndex: this.dnfIndex,
      playerPlace
    };
  }

  private clearWatchdog() {
    if (this.watchdogId != null) {
      clearTimeout(this.watchdogId);
      this.watchdogId = null;
    }
  }

  private resolveFinishOnce() {
    if (this.finished) return;              // idempotent
    this.finished = true;
    this.clearWatchdog();
    const res = this.buildResult();
    this.finishResolve?.(res);
    this.finishResolve = null;
    this.finishPromise = null;
  }

  // --------------------------------------------------------------------------

  attach(setSpeeds: SetSpeedsFn, getProgress: GetProgressFn) {
    this.setSpeeds   = setSpeeds;
    this.getProgress = getProgress;
  }

  recomputeEqualization() {
    this.vEq = equalizedSpeedsFromLanes(this.lanes, this.baseSpeed, { index: this.playerIndex });
    this.planFinishTimes();
  }

  // Deterministic final order and gaps
  setOutcome(place: Outcome) {
    const others = [0,1,2,3].filter(i => i !== this.playerIndex);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    if (place === 'DNF') {
      this.orderFinal = [others[0], others[1], others[2], this.playerIndex];
      this.dnfIndex   = this.playerIndex;
      this.dnfCutU    = rr(this.rng, 0.55, 0.85);
      this.finishGapsSec = makeFinishGaps('DNF', this.rng, this.gapScale);
      this.planFinishTimes();
      return;
    }

    const ppos = Math.max(0, Math.min(place - 1, 3));
    const out  = new Array<number>(4);
    out[ppos]  = this.playerIndex;
    let oi = 0;
    for (let pos = 0; pos < 4; pos++) {
      if (pos === ppos) continue;
      out[pos] = others[oi++];
    }
    this.orderFinal = out;
    this.finishGapsSec = makeFinishGaps(place, this.rng, this.gapScale);
    this.dnfIndex = null;
    this.planFinishTimes();
  }

  // Plan absolute finish TIMES per car; DNF gets a cut distance
  private planFinishTimes() {
    const T0 = this.T;
    this.tFinish = [T0, T0, T0, T0];
    this.sCut = null;

    const winCar = this.orderFinal[0];
    this.tFinish[winCar] = T0;

    for (let pos = 1; pos < 4; pos++) {
      const car = this.orderFinal[pos];
      const g   = this.finishGapsSec[pos] || 0;
      this.tFinish[car] = T0 + g;
    }

    if (this.dnfIndex != null) {
      const L = this.laneLens[this.dnfIndex];
      this.sCut = L * this.dnfCutU * 0.98;
    }
  }

  start() {
    this.stop();

    // reset finish state for a fresh round
    this.finished = false;
    this.finishResolve = null;
    this.finishPromise = null;

    // (re)start RAF
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      this.update(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);

    // start watchdog: guarantee resolve even if RAF stalls
    this.clearWatchdog();
    const latestFinish = Math.max(...this.tFinish);
    const slackMs = 250;
    const ms = Math.max(500, (latestFinish + 2.0) * 1000 + slackMs);
    this.watchdogId = window.setTimeout(() => {
      // If not yet resolved by normal path, do it now.
      this.stop();               // will also resolve (idempotent)
    }, ms);
  }

  stop() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;

    // If someone stops externally before normal resolve, still resolve safely.
    this.resolveFinishOnce();
  }

  reset() { this.t = 0; }
  prime() { this.setSpeeds(this.vEq.slice()); }

  // -------- rank helpers to shape the mid-race order -------------------------
  private orderFromProgress(s: number[]): number[] {
    const idx = [0,1,2,3];
    idx.sort((a,b) => s[b] - s[a]); // leader first
    return idx;
  }

  private desiredPlayerRank(u: number): 1|2|3|4 {
    const jitter = this.rng() < 0.25 ? (this.rng() < 0.5 ? -1 : +1) : 0;
    const clampRank = (r: number) => Math.max(1, Math.min(4, r));

    const finalRank = (this.orderFinal.findIndex(c => c === this.playerIndex) + 1) as 1|2|3|4;

    let base = finalRank;
    if (finalRank === 1) {
      base = (u < 0.35) ? 2 : 1;
    } else if (finalRank === 2) {
      base = (u < 0.25) ? 2 : (u < 0.55 ? 2 : 2);
    } else if (finalRank === 3) {
      base = (u < 0.20) ? 3 : (u < 0.60 ? 3 : 3);
    } else {
      base = (u < 0.25) ? 4 : 4;
    }

    if (u > 0.35 && u < 0.70) {
      base = clampRank(base + jitter);
    }
    return clampRank(base) as 1|2|3|4;
  }

  private nudgePlayerTowards(order: number[], targetRank: number): number[] {
    const cur = order.slice();
    const i = cur.indexOf(this.playerIndex);
    const t = clamp(Math.floor(targetRank - 1), 0, 3);
    if (i === -1 || i === t) return cur;
    const step = i < t ? +1 : -1;
    const j = i + step;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    return cur;
  }

  private blendToFinal(order: number[], blend: number): number[] {
    if (blend <= 0) return order;
    if (blend >= 1) return this.orderFinal.slice();

    let cur = order.slice();
    const steps = Math.ceil(3 * blend);
    for (let k = 0; k < steps; k++) {
      for (let pos = 0; pos < 4; pos++) {
        const want = this.orderFinal[pos];
        const i = cur.indexOf(want);
        if (i > pos) {
          [cur[i-1], cur[i]] = [cur[i], cur[i-1]];
        }
      }
    }
    return cur;
  }
  // ---------------------------------------------------------------------------

  update(dt: number) {
    if (!this.setSpeeds || !this.getProgress) return;

    this.t += dt;
    const u = clamp(this.t / this.T, 0, 1);
    const s = this.getProgress();

    // --- Late hard lock: make each car hit its finish TIME (or DNF cut) ------
    if (u >= this.uLockStart) {
      const tNow = this.t;
      const alpha = (u - this.uLockStart) / Math.max(1e-6, (this.uKillChaos - this.uLockStart));
      const blend = clamp(alpha, 0, 1);
      const P = this.phase(u);

      this.finishedCount = 0;

      for (let i = 0; i < 4; i++) {
        const L    = this.laneLens[i];
        const sNow = s[i];

        if (this.dnfIndex === i && this.sCut != null) {
          const sGoal = this.sCut;
          const remaining = Math.max(0, sGoal - sNow);
          if (remaining <= 0.01) { this.vNow[i] = 0; this.finishedCount++; continue; }
          const tRem = Math.max(0.15, (this.T - tNow));
          const vBallistic = remaining / tRem;
          const vEq = this.vEq[i] * P;
          const vSoft = (1 - blend) * vEq + blend * vBallistic;
          this.vNow[i] = Math.max(0, vSoft);
          continue;
        }

        const tFin = this.tFinish[i] || this.T;
        const tRem = Math.max(1e-3, tFin - tNow);
        const remaining = Math.max(0, L - s[i]);

        if (remaining <= 0.01) { this.vNow[i] = 0; this.finishedCount++; continue; }

        const vBallistic = remaining / tRem;
        const chaos = (u < this.uKillChaos) ? (1 - blend) * ((this.rng() * 2 - 1) * this.noiseFrac) : 0;
        const vEq   = this.vEq[i] * P;
        const vSoft = (1 - blend) * vEq + blend * vBallistic;

        const vMax = Math.max(vEq * 3.0, vBallistic * 1.25);
        this.vNow[i] = clamp(vSoft * (1 + chaos), 0, vMax);
      }

      this.setSpeeds(this.vNow);

      if (this.finishedCount >= 4) { this.stop(); return; }
      const latestFinish = Math.max(...this.tFinish);
      if (this.t > latestFinish + 2.0) { this.stop(); return; }

      return;
    }

    // --- Normal dramatic phase (before lock) ---------------------------------
    const P = this.phase(u);
    const sigma = this.applyBeats(u);
    const sStar = this.targetsDramatic(u, s);

    const corrMaxPerCar = this.vEq.map(v => v * this.corrMaxFrac);
    const corr = s.map((si, i) => {
      const dv = this.k * (sStar[i] - si) * this.T;
      return clamp(dv, -corrMaxPerCar[i], +corrMaxPerCar[i]);
    });

    for (let i = 0; i < 4; i++) {
      const noise = (this.rng() * 2 - 1) * this.noiseFrac;
      let v = this.vEq[i] * P * (1 + sigma[i] + noise) + corr[i];
      if (this.dnfIndex === i && u >= this.dnfCutU) {
        const f = clamp(1 - (u - this.dnfCutU) / (0.08 + rr(this.rng, 0.04, 0.08)), 0, 1);
        v *= f;
      }
      this.vNow[i] = Math.max(0, v);
    }
    this.setSpeeds(this.vNow);
  }

  // --- Phase flavor ----------------------------------------------------------
  private phase(u: number): number {
    const { start, mid, final } = this.phaseBoosts;
    if (u < 0.15)       return lerp(1, start, easeInOutCubic(u / 0.15));
    if (u < 0.85) { const t = (u - 0.15) / 0.70; return lerp(start, mid,  easeInOutCubic(t)); }
    { const t = (u - 0.85) / 0.15; return lerp(mid, final, easeInOutCubic(t)); }
  }

  // --- Beats (disabled near finish by lock) ----------------------------------
  private makeBeats(count: number, span: [number, number]): Beat[] {
    const arr: Beat[] = [];
    for (let i = 0; i < count; i++) {
      const width  = rr(this.rng, 0.05, 0.12);
      const center = rr(this.rng, span[0], span[1]);
      const u0 = clamp(center - width/2, 0.05, 0.94);
      const u1 = clamp(center + width/2, 0.06, 0.96);
      const who = Math.floor(this.rng() * 4);
      const amp = rr(this.rng, 0.08, 0.16) * (this.rng() < 0.5 ? +1 : -1);
      arr.push({ u0, u1, who, amp });
    }
    return arr;
  }

  private applyBeats(u: number): number[] {
    const sig = [0,0,0,0];
    for (const b of this.beats) {
      if (u < b.u0 || u > b.u1) continue;
      const t = (u - b.u0) / Math.max(1e-6, (b.u1 - b.u0));
      const w = Math.sin(Math.PI * t);
      sig[b.who] += b.amp * w;
      for (let i = 0; i < 4; i++) if (i !== b.who) sig[i] += -0.25 * b.amp * w / 3;
    }
    if (u > 0.80) for (let i = 0; i < 4; i++) sig[i] *= lerp(1, 0, (u - 0.80) / 0.06);
    return sig;
  }

  // --- Dramatic (pre-lock) targets ------------------------------------------
  private targetsDramatic(u: number, sCurrent: number[]): number[] {
    const vMean = this.vEq.reduce((a,b)=>a+b,0) / Math.max(1, this.vEq.length);
    const Gfinal = this.finishGapsSec.slice();

    const scaleEarly = rr(this.rng, this.spreadEarly[0], this.spreadEarly[1]);
    const scaleMid   = rr(this.rng, this.spreadMid[0],   this.spreadMid[1]);

    const Gearly = [0, Gfinal[1]*scaleEarly, Gfinal[2]*scaleEarly, Gfinal[3]*scaleEarly];
    const Gmid   = [0, Gfinal[1]*scaleMid,   Gfinal[2]*scaleMid,   Gfinal[3]*scaleMid];

    const midAt = 0.6;
    const t01 = clamp(u, 0, 1);
    const g2 = (t01 <= midAt) ? lerp(Gearly[1], Gmid[1], t01/midAt) : lerp(Gmid[1], Gfinal[1], (t01-midAt)/(1-midAt));
    const g3 = (t01 <= midAt) ? lerp(Gearly[2], Gmid[2], t01/midAt) : lerp(Gmid[2], Gfinal[2], (t01-midAt)/(1-midAt));
    const g4 = (t01 <= midAt) ? lerp(Gearly[3], Gmid[3], t01/midAt) : lerp(Gmid[3], Gfinal[3], (t01-midAt)/(1-midAt));

    const Gphase = [0, g2, Math.max(g2+0.02, g3), Math.max(Math.max(g2+0.03, g3+0.02), g4)];
    const gapsM  = Gphase.map(sec => sec * vMean);

    let order = this.orderFromProgress(sCurrent);

    const playerTarget = this.desiredPlayerRank(u);
    order = this.nudgePlayerTowards(order, playerTarget);

    const convBlend = smoothstep(this.uConvStart, this.uLockStart, u);
    order = this.blendToFinal(order, convBlend);

    const sTarget = new Array(4).fill(0);
    for (let rank = 0; rank < 4; rank++) {
      const car = order[rank];
      const L   = this.laneLens[car];
      const sBase = L * u;
      const gap  = gapsM[rank];
      sTarget[car] = clamp(sBase - gap, 0, L);
    }

    if (this.dnfIndex != null && this.sCut != null) {
      sTarget[this.dnfIndex] = Math.min(sTarget[this.dnfIndex], this.sCut);
    }

    if (u > 0.88) {
      for (let i = 0; i < 4; i++) {
        sTarget[i] = Math.max(sTarget[i], sCurrent[i] - 0.5);
      }
    }
    return sTarget;
  }
}
