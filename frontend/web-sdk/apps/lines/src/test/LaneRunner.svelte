<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // ===== Public API =====
  export type Pt = { x: number; y: number };

  export let lanes: Pt[][] = [];
  export let carImgs: (string | null)[] = [];
  export let speeds: number[] = [];
  export let starts: number[] = [];
  export let headingOffsets: number[] = [];    // default -90 für alle

  // Car sizes / placement
  export let imgWidth = 6;
  export let imgHeight = 3;
  export let carSizes: ({ w: number; h: number } | null)[] = [];
  export let carOffsets: ({ dx: number; dy: number } | null)[] = [];

  export let rotateWithHeading = true;
  export let loop = true;
  export let debug = false;
  export let className = '';

  // --------- Track-Rendering-Props ---------
  export let trackPath: Pt[] | null = null;
  export let trackWidth = 24;                  // Gesamtbreite Asphalt
  export let asphaltColor = '#a78860'//'#2e2e2e';         // dunkles Asphaltgrau

  /** NEU: Asphalt-Textur – 'none' = glatt (Default), 'noise' = leicht körnig */
  export let asphaltTexture: 'none' | 'noise' = 'none';

  // Curbs (rot-weiß)
  export let showCurbs = true;
  export let curbWidth = 2.2;                  // je Seite
  export let curbDash = 8;                     // Länge der weißen Kacheln

  export function setSpeeds(v: number[]) { speeds = v.slice(); }
  export function getProgress(): number[] { return S.slice(); }

  let running = false;

  // ===== Internals =====
  type LaneGeom = { pts: Pt[]; cum: number[]; total: number };
  const laneGeoms: (LaneGeom | null)[] = [];

  let S: number[] = [];             // Fortschritt
  let X: number[] = [];
  let Y: number[] = [];
  let H: number[] = [];             // Heading (rad)
  let imgError: boolean[] = [];

  // ViewBox
  let vbMinX = 0, vbMinY = 0, vbW = 100, vbH = 100;

  const hypot = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

  function buildLane(pts: Pt[]): LaneGeom | null {
    if (!pts || pts.length < 2) return null;
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + hypot(pts[i - 1], pts[i]);
    return { pts, cum, total: cum[cum.length - 1] };
  }

  function rebuildGeoms() {
    laneGeoms.length = 0;
    const n = lanes?.length ?? 0;
    for (let i = 0; i < n; i++) laneGeoms[i] = buildLane(lanes[i]);

    const N = n;
    S = new Array(N).fill(0);
    X = new Array(N).fill(0);
    Y = new Array(N).fill(0);
    H = new Array(N).fill(0);
    imgError = new Array(N).fill(false);

    for (let i = 0; i < N; i++) {
      const g = laneGeoms[i];
      const st = starts[i] ?? 0;
      S[i] = g ? ((st % g.total) + g.total) % g.total : 0;
      if (g) samplePose(i, g, S[i], /*init*/true);
    }
  }

  const seekIdx: number[] = [];

  function samplePose(idx: number, G: LaneGeom, distS: number, init = false) {
    if (!G || G.total <= 0) return;
    if (init || seekIdx[idx] == null) seekIdx[idx] = 1;

    let sLocal = distS;
    if (loop) sLocal = ((sLocal % G.total) + G.total) % G.total;
    else sLocal = Math.min(Math.max(0, sLocal), G.total - 1e-6);

    while (seekIdx[idx] < G.cum.length && G.cum[seekIdx[idx]] < sLocal) seekIdx[idx]++;
    while (seekIdx[idx] > 0 && G.cum[seekIdx[idx] - 1] > sLocal) seekIdx[idx]--;

    const i1 = Math.min(seekIdx[idx], G.cum.length - 1);
    const i0 = Math.max(0, i1 - 1);
    const s0 = G.cum[i0], s1 = G.cum[i1];
    const t = s1 > s0 ? (sLocal - s0) / (s1 - s0) : 0;

    const p0 = G.pts[i0], p1 = G.pts[i1];
    X[idx] = p0.x + (p1.x - p0.x) * t;
    Y[idx] = p0.y + (p1.y - p0.y) * t;

    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    H[idx] = Math.atan2(dy, dx);
  }

  function rebuildViewBox() {
    const pts: Pt[] = [];
    for (const ln of lanes || []) if (ln) pts.push(...ln);
    if (!pts.length) { vbMinX = 0; vbMinY = 0; vbW = 100; vbH = 100; return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = 10;
    vbMinX = minX - pad;
    vbMinY = minY - pad;
    vbW = (maxX - minX) + pad * 2;
    vbH = (maxY - minY) + pad * 2;
  }

  let rafId: number | null = null;
  let lastT = 0;

  function tick(now: number) {
    if (!rafId) rafId = requestAnimationFrame(tick);
    if (!laneGeoms.length) { lastT = now; return; }
    if (!running) { lastT = now; return; }

    const dt = lastT ? (now - lastT) / 1000 : 0;
    lastT = now;

    for (let i = 0; i < laneGeoms.length; i++) {
      const G = laneGeoms[i];
      if (!G) continue;
      const v = speeds[i] ?? 0;
      S[i] += v * dt;
      samplePose(i, G, S[i]);
    }
    rafId = requestAnimationFrame(tick);
  }

  export function start() {
    if (!laneGeoms.length) return;
    running = true;
    lastT = 0;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  export function stop() { running = false; }

  export function reset(useStarts = true) {
    for (let i = 0; i < laneGeoms.length; i++) {
      const g = laneGeoms[i];
      const base = useStarts ? (starts[i] ?? 0) : 0;
      S[i] = g ? ((base % g.total) + g.total) % g.total : 0;
      if (g) samplePose(i, g, S[i], /*init*/true);
    }
    lastT = 0;
  }

  // ===== Track-Helfer =====
  function toPathD(pts: Pt[]): string {
    if (!pts || pts.length === 0) return '';
    const [p0, ...rest] = pts;
    return `M ${p0.x} ${p0.y} ` + rest.map(p => `L ${p.x} ${p.y}`).join(' ');
  }

  function averageCenterFromLanes(all: Pt[][]): Pt[] {
    if (!all || all.length < 2) return all?.[0] ?? [];
    const inner = all[0];
    const outer = all[all.length - 1];
    if (!inner?.length || !outer?.length) return all[Math.floor(all.length / 2)] ?? [];
    if (inner.length !== outer.length) return all[Math.floor(all.length / 2)] ?? inner;
    const out: Pt[] = new Array(inner.length);
    for (let i = 0; i < inner.length; i++) {
      out[i] = { x: (inner[i].x + outer[i].x) / 2, y: (inner[i].y + outer[i].y) / 2 };
    }
    return out;
  }

  $: centerLine = (trackPath && trackPath.length) ? trackPath : averageCenterFromLanes(lanes);
  $: dCenter = toPathD(centerLine);

  // Reactivity / Lifecycle
  $: rebuildViewBox();
  $: rebuildGeoms();
  onMount(() => {});
  onDestroy(() => { stop(); });
</script>

<svg
  class={"lanerunner " + (className || "")}
  viewBox="{vbMinX} {vbMinY} {vbW} {vbH}"
  preserveAspectRatio="xMidYMid meet"
  width="100%" height="100%"
  style="display:block; background: transparent; isolation:isolate; contain:paint; shape-rendering:geometricPrecision;"
>
  <defs>
    <!-- Optional: leichte Noise-Textur, nur wenn asphaltTexture==='noise' -->
    <filter id="asphaltNoise" filterUnits="objectBoundingBox" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
      <feComposite in="gray" in2="SourceAlpha" operator="in" result="masked" />
      <feBlend in="SourceGraphic" in2="masked" mode="multiply" result="blended" />
      <feGaussianBlur in="blended" stdDeviation="0.12"/>
    </filter>
  </defs>

  {#if dCenter}
    {#if showCurbs}
      <path d={dCenter}
        fill="none"
        stroke="#826135"
        stroke-width={trackWidth + curbWidth*2}
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.95"
      />
      <path d={dCenter}
        fill="none"
        stroke="#9d8162"
        stroke-width={trackWidth + curbWidth*2}
        stroke-dasharray={`${curbDash},${curbDash}`}
        stroke-linecap="butt"
        stroke-linejoin="round"
        opacity="0.96"
      />
    {/if}

    <!-- Asphalt: jetzt glatt (kein Filter), Noise optional schaltbar -->
    <path d={dCenter}
      fill="none"
      stroke={asphaltColor}
      stroke-width={trackWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      filter={asphaltTexture === 'noise' ? 'url(#asphaltNoise)' : null}
    />
  {/if}

  {#if debug}
    {#each lanes as ln, i}
      <polyline
        points="{ln.map(p => `${p.x},${p.y}`).join(' ')}"
        fill="none"
        stroke="hsl({(i*90)%360},60%,50%)"
        stroke-width="0.7"
        opacity="0.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/each}
  {/if}

  {#each lanes as _, i}
    {#if laneGeoms[i]}
      {@const sz = carSizes[i] ?? null}
      {@const w = sz ? sz.w : imgWidth}
      {@const h = sz ? sz.h : imgHeight}
      {@const offs = carOffsets[i] ?? {dx:0, dy:0}}
      {@const deg = (rotateWithHeading ? (H[i] * 180 / Math.PI) : 0) + (headingOffsets[i] ?? -90)}

      {#if carImgs[i] && !imgError[i]}
        <image
          href={carImgs[i] as string}
          x={(X[i] - w/2 + offs.dx)}
          y={(Y[i] - h/2 + offs.dy)}
          width={w}
          height={h}
          transform="rotate({deg} {X[i]} {Y[i]})"
          on:error={() => imgError[i] = true}
          preserveAspectRatio="xMidYMid meet"
          style="image-rendering: optimizeQuality;"
        />
      {:else}
        <circle cx={X[i]} cy={Y[i]} r={Math.max(w,h)/2} fill="deepskyblue" opacity="0.85" />
      {/if}
    {/if}
  {/each}
</svg>

<style>
  .lanerunner { background: transparent; }
</style>
