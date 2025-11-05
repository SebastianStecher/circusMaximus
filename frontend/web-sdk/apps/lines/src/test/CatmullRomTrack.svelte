<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // ==== Public API (Props) ====
  export type Waypoint = { x: number; y: number };

  // Pflicht: Liste an Wegpunkten (>= 4). Reihenfolge = Fahrtrichtung.
  export let waypoints: Waypoint[] = [];

  // Geschlossene Rundstrecke? (Für F1 i. d. R. true)
  export let closed = true;

  // Centripetal-Parameter alpha (0.5 = centripetal, 1.0 = chordal, 0.0 = uniform)
  export let alpha = 0.5;

  // Fein-Sampling-Schritt je Segment (klein = glatter, teurer)
  export let segmentStep = 0.02; // in [0..1] des lokalen Segment-Parameters

  // Gleichabstand der finalen LUT in "Metern" (deiner Track-Skala)
  export let spacing = 0.5;

  // Lanes relativ zur Centerline in derselben Skala (z. B. Meter)
  export let laneOffsets: number[] = [-3, -1.5, 1.5, 3];

  // Debug-Rendering (SVG) anzeigen?
  export let debug = true;

  // Debug-Skalierung im SVG (1.0 = 1:1), und Padding
  export let debugScale = 1.0;
  export let debugPadding = 20;

  const dispatch = createEventDispatcher();

  // ==== Intern: Typen ====
  type Pt = { x: number; y: number };
  type Sample = {
    x: number; y: number;       // Position
    s: number;                  // Bogenlänge ab Start (m)
    tx: number; ty: number;     // Tangenten-Einheitsvektor
    nx: number; ny: number;     // Normalen-Einheitsvektor (links von Tangente)
    heading: number;            // Winkel in Rad (atan2(ty, tx))
  };

  // ==== Utility ====
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

  // Zwingt einen Index ins Intervall [0, n) (Wrap für closed tracks)
  const wrapIndex = (i: number, n: number) => ((i % n) + n) % n;

  // === Centripedal Catmull-Rom Evaluator über 4 Punkte (P0..P3), t in [t1, t2]
  //   Siehe: Wikipedia "Centripetal Catmull–Rom spline" (De Casteljau-ähnliche Interpolation)
  function catmullRomCentripetal(P0: Pt, P1: Pt, P2: Pt, P3: Pt, t: number, alpha: number): Pt {
    // t0, t1, t2, t3 entlang chord-length^alpha
    const t0 = 0;
    const t1 = t0 + Math.pow(dist(P0, P1), alpha);
    const t2 = t1 + Math.pow(dist(P1, P2), alpha);
    const t3 = t2 + Math.pow(dist(P2, P3), alpha);

    // Guard: wenn Punkte identisch liegen, vermeide Division durch 0
    const safe = (a: number, b: number) => (Math.abs(b - a) < 1e-8 ? 1 : b - a);

    // Clamp t in [t1, t2]
    const tt = Math.min(Math.max(t, t1), t2);

    // Stufenweise Interpolation
    const A1 = {
      x: ((t1 - tt) / safe(t1, t0)) * P0.x + ((tt - t0) / safe(t1, t0)) * P1.x,
      y: ((t1 - tt) / safe(t1, t0)) * P0.y + ((tt - t0) / safe(t1, t0)) * P1.y
    };
    const A2 = {
      x: ((t2 - tt) / safe(t2, t1)) * P1.x + ((tt - t1) / safe(t2, t1)) * P2.x,
      y: ((t2 - tt) / safe(t2, t1)) * P1.y + ((tt - t1) / safe(t2, t1)) * P2.y
    };
    const A3 = {
      x: ((t3 - tt) / safe(t3, t2)) * P2.x + ((tt - t2) / safe(t3, t2)) * P3.x,
      y: ((t3 - tt) / safe(t3, t2)) * P2.y + ((tt - t2) / safe(t3, t2)) * P3.y
    };

    const B1 = {
      x: ((t2 - tt) / safe(t2, t0)) * A1.x + ((tt - t0) / safe(t2, t0)) * A2.x,
      y: ((t2 - tt) / safe(t2, t0)) * A1.y + ((tt - t0) / safe(t2, t0)) * A2.y
    };
    const B2 = {
      x: ((t3 - tt) / safe(t3, t1)) * A2.x + ((tt - t1) / safe(t3, t1)) * A3.x,
      y: ((t3 - tt) / safe(t3, t1)) * A2.y + ((tt - t1) / safe(t3, t1)) * A3.y
    };

    const C = {
      x: ((t2 - tt) / safe(t2, t1)) * B1.x + ((tt - t1) / safe(t2, t1)) * B2.x,
      y: ((t2 - tt) / safe(t2, t1)) * B1.y + ((tt - t1) / safe(t2, t1)) * B2.y
    };
    return C;
  }

  // Ableitung numerisch (kleiner Vorwärtsschritt entlang des lokalen Parameters)
  function catmullRomTangent(P0: Pt, P1: Pt, P2: Pt, P3: Pt, t: number, alpha: number): Pt {
    const eps = 1e-4;
    const p = catmullRomCentripetal(P0, P1, P2, P3, t, alpha);
    const q = catmullRomCentripetal(P0, P1, P2, P3, t + eps, alpha);
    let dx = q.x - p.x;
    let dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    return { x: dx, y: dy };
  }

  // === Fein-Sampling der gesamten Kurve über alle Segmente
  function sampleFine(pts: Pt[], closed: boolean, alpha: number, step: number): Pt[] {
    const n = pts.length;
    if (n < 4) return [];

    const out: Pt[] = [];

    const segCount = closed ? n : n - 3; // bei open: Segmente von (0..n-4) über (P0..P3)
    for (let si = 0; si < segCount; si++) {
      // Segment P1->P2, mit P0,P1,P2,P3
      const i0 = closed ? wrapIndex(si - 1, n) : si + 0;
      const i1 = closed ? wrapIndex(si + 0, n) : si + 1;
      const i2 = closed ? wrapIndex(si + 1, n) : si + 2;
      const i3 = closed ? wrapIndex(si + 2, n) : si + 3;

      const P0 = pts[i0], P1 = pts[i1], P2 = pts[i2], P3 = pts[i3];

      // Parameter-Spanne (t1..t2)
      const t0 = 0;
      const t1 = t0 + Math.pow(dist(P0, P1), alpha);
      const t2 = t1 + Math.pow(dist(P1, P2), alpha);
      const t3 = t2 + Math.pow(dist(P2, P3), alpha);

      // Lauf t in [t1..t2]
      const start = t1, end = t2;
      const steps = Math.max(2, Math.ceil((end - start) / step));

      for (let j = 0; j < steps; j++) {
        const tt = start + (j / (steps - 1)) * (end - start);
        const p = catmullRomCentripetal(P0, P1, P2, P3, tt, alpha);
        out.push(p);
      }
      // Letzten Punkt pro Segment nicht doppeln → handled durch j range
    }

    // für closed: Endpunkt = Startpunkt vermeiden
    if (closed && out.length > 1) {
      const a = out[0], b = out[out.length - 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) out.pop();
    }
    return out;
  }

  // === Aus fein gesampelten Punkten eine Gleichabstands-LUT bauen
  function buildEqualDistanceLUT(fine: Pt[], spacing: number): Sample[] {
    if (fine.length < 2) return [];

    // Kumulierte Längen
    const acc: number[] = [0];
    for (let i = 1; i < fine.length; i++) {
      acc[i] = acc[i - 1] + dist(fine[i - 1], fine[i]);
    }
    const total = acc[acc.length - 1];

    // Zielpositionen in s: 0..total in spacing-Schritten
    const targetS: number[] = [];
    for (let s = 0; s <= total; s += spacing) targetS.push(s);
    // Sicherstellen, dass genau am Ende auch ein Sample existiert
    if (targetS[targetS.length - 1] < total) targetS.push(total);

    const out: Sample[] = [];
    let idx = 0;

    for (const s of targetS) {
      // Finde Segment [idx-1, idx] das s überspannt
      while (idx < acc.length && acc[idx] < s) idx++;
      const i1 = Math.min(idx, acc.length - 1);
      const i0 = Math.max(0, i1 - 1);
      const s0 = acc[i0];
      const s1 = acc[i1];
      const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;

      const p0 = fine[i0], p1 = fine[i1];
      const pos = lerpPt(p0, p1, t);

      // Tangente numerisch aus Nachbarn (robust, 2-Punkt)
      const iPrev = Math.max(0, i0 - 1);
      const iNext = Math.min(fine.length - 1, i1 + 1);
      let tx = fine[iNext].x - fine[iPrev].x;
      let ty = fine[iNext].y - fine[iPrev].y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;

      // Normale = linksdrehung der Tangente
      const nx = -ty;
      const ny = tx;

      const heading = Math.atan2(ty, tx);

      out.push({
        x: pos.x, y: pos.y,
        s,
        tx, ty, nx, ny,
        heading
      });
    }

    // Für geschlossene Tracks magst du evtl. das letzte Sample entfernen, um Duplikate zu vermeiden
    return out;
  }

  let fine: Pt[] = [];
  let centerline: Sample[] = [];
  let totalLength: number = 0;
  let lanes: Pt[][] = [];

  // ==== Reactive Build ====
  $: fine = (waypoints?.length ?? 0) >= 4
    ? sampleFine(waypoints, closed, alpha, segmentStep)
    : [];

  $: centerline = fine.length
    ? buildEqualDistanceLUT(fine, spacing)
    : [];

  $: totalLength = centerline.length
    ? centerline[centerline.length - 1].s
    : 0;

  $: lanes = centerline.length
    ? laneOffsets.map(off =>
        centerline.map(p => ({ x: p.x + p.nx * off, y: p.y + p.ny * off }))
      )
    : [];

  // Event nach außen geben, sobald wir sinnvolle Daten haben
  $: if (centerline.length) {
    dispatch('ready', {
      length: totalLength,
      spacing,
      centerline,          // Array<Sample> – gleichabständig
      lanes,               // Array<Array<Pt>> – je Lane polyline-Punkte
      laneOffsets
    });
  }

  // ==== Debug-Rendering / SVG Bounds ====
  function boundsOf(points: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  let dbgPoints: Pt[] = [];
  let bbox: { minX: number; minY: number; maxX: number; maxY: number } = {
    minX: 0, minY: 0, maxX: 100, maxY: 100
  };
  let vbMinX = 0, vbMinY = 0, vbW = 100, vbH = 100;

  $: {
    const lanePts: Pt[] = lanes.length
      ? lanes.reduce((acc, ln) => (acc.push(...ln), acc), [] as Pt[])
      : [];

    dbgPoints = [
      ...waypoints,
      ...fine,
      ...lanePts
    ];
  }

  $: bbox = dbgPoints.length
    ? boundsOf(dbgPoints)
    : { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  $: vbMinX = bbox.minX - debugPadding;
  $: vbMinY = bbox.minY - debugPadding;
  $: vbW    = (bbox.maxX - bbox.minX) + 2 * debugPadding;
  $: vbH    = (bbox.maxY - bbox.minY) + 2 * debugPadding;

  // Hilfsfunktion für SVG polyline
  function toPolyline(points: Pt[]): string {
    return points.map(p => `${p.x * debugScale},${p.y * debugScale}`).join(' ');
  }
</script>

{#if debug}
  <svg
    viewBox="{vbMinX * debugScale} {vbMinY * debugScale} {vbW * debugScale} {vbH * debugScale}"
    width="100%" height="100%" style="display:block; background: rgba(0,0,0,0.04); border-radius: 8px;"
  >
    <!-- Lanes -->
    {#each lanes as lane, i}
      <polyline
        points="{toPolyline(lane)}"
        fill="none"
        stroke="hsl({(i*90)%360}, 60%, 45%)"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.8"
      />
    {/each}

    <!-- Centerline -->
    {#if centerline.length}
      <polyline
        points="{toPolyline(centerline.map(p=>({x:p.x,y:p.y})))}"
        fill="none"
        stroke="#111"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.9"
      />
      <!-- Normals (seltener gezeichnet) -->
      {#each centerline as p, idx}
        {#if idx % Math.max(1, Math.floor(2.0/spacing)) === 0}
          <line
            x1="{p.x * debugScale}" y1="{p.y * debugScale}"
            x2="{(p.x + p.nx * 0.8) * debugScale}" y2="{(p.y + p.ny * 0.8) * debugScale}"
            stroke="#888" stroke-width="1" opacity="0.6"
          />
        {/if}
      {/each}
    {/if}

    <!-- Waypoints -->
    {#each waypoints as wp, i}
      <circle cx="{wp.x * debugScale}" cy="{wp.y * debugScale}" r="2.5" fill="#ff3e00" />
      <text x="{(wp.x + 3) * debugScale}" y="{(wp.y - 3) * debugScale}" font-size="10" fill="#333">{i}</text>
    {/each}
  </svg>
{/if}
