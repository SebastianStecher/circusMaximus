type Pt = { x: number; y: number };

function laneLength(pts: Pt[]): number {
  if (!pts || pts.length < 2) return 0;
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    L += Math.hypot(dx, dy);
  }
  return L;
}

type EqualizeOpts =
  | { ref: 'avg' }                 // Referenz = Durchschnitt aller Lanes (Default)
  | { ref: 'index'; index: number } // Referenz = bestimmte Lane (z. B. Spieler-Lane)
  ;

export function laneSpeedDeltas(
  lanes: Pt[][],
  baseSpeed: number,
  opts: EqualizeOpts = { ref: 'avg' }
): number[] {
  const lengths = lanes.map(laneLength);
  if (!lengths.length || baseSpeed === 0) return new Array(lanes.length).fill(0);

  const Lref =
    opts.ref === 'index'
      ? lengths[Math.max(0, Math.min(opts.index, lengths.length - 1))]
      : lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Schutz gegen Division durch 0
  const eps = 1e-9;
  const ref = Math.max(Lref, eps);

  // Δv_i = v * (L_i/L_ref - 1)
  return lengths.map(Li => baseSpeed * (Li / ref - 1));
}

/** Wenn du gleich die absoluten Speeds willst (ohne erst +Δv zu addieren) */
export function laneSpeedsEqualized(
  lanes: Pt[][],
  baseSpeed: number,
  opts: EqualizeOpts = { ref: 'avg' }
): number[] {
  const deltas = laneSpeedDeltas(lanes, baseSpeed, opts);
  return deltas.map(dv => baseSpeed + dv);
}
