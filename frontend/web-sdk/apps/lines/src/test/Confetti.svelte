<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // ========== Public API (Props) ==========
  export let colors: string[] = ['#ffd400', '#ff4d4d', '#4dd2ff', '#7dff7a', '#ffffff'];
  export let gravity = 900;           // px/s^2
  export let airDrag = 0.98;          // 0..1 (pro Frame)
  export let wind = 0;                // px/s (positiv = nach rechts)
  export let zIndex = 9999;           // Overlay-Priorität
  export let particleSize = { min: 4, max: 10 };
  export let burstCount = 160;        // Gesamtzahl bei fire('both')
  export let spreadDeg = 24;          // Streuwinkel um den Basisschuss
  export let originY = { min: 0.45, max: 0.5 }; // relative Höhe für Kanonen

  // ========== Internals ==========
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = false;

  type P = {
    x: number; y: number;
    vx: number; vy: number;
    rot: number; vr: number;
    size: number;
    color: string;
    shape: 0|1|2; // 0=rect,1=tri,2=circle
    life: number; // s
    ttl: number;  // s
  };

  const particles: P[] = [];
  let lastT = 0;

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const { clientWidth: w, clientHeight: h } = canvas.parentElement ?? canvas;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
  }

  function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
  function pick<T>(arr: T[]) { return arr[(Math.random() * arr.length) | 0]; }

  function ensureLoop() {
    if (!running) {
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  function stopLoopIfIdle() {
    if (running && particles.length === 0) {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      ctx?.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  }

  function loop(now: number) {
    const dt = Math.min(0.033, (now - lastT) / 1000); // clamp dt
    lastT = now;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // update & draw
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // physics
      p.vx = (p.vx + wind * dt) * airDrag;
      p.vy = (p.vy + gravity * dt) * airDrag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;

      // fade out towards the end
      const alpha = Math.max(0, 1 - p.life / p.ttl);

      // cull
      if (p.life >= p.ttl || p.y > h + 60 || p.x < -60 || p.x > w + 60) {
        particles.splice(i, 1);
        continue;
      }

      // draw
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      const s = p.size;
      if (p.shape === 0) {
        // rectangle
        ctx.fillRect(-s/2, -s/2, s, s);
      } else if (p.shape === 1) {
        // triangle
        ctx.beginPath();
        ctx.moveTo(0, -s/1.2);
        ctx.lineTo(-s/1.2, s/1.2);
        ctx.lineTo(s/1.2, s/1.2);
        ctx.closePath();
        ctx.fill();
      } else {
        // circle
        ctx.beginPath();
        ctx.arc(0, 0, s/2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length > 0) {
      raf = requestAnimationFrame(loop);
    } else {
      stopLoopIfIdle();
    }
  }

  type Side = 'left' | 'right' | 'both';
  type FireOpts = {
    count?: number;       // Anzahl Partikel für diesen Schuss
    power?: number;       // Startgeschwindigkeit (px/s)
    ttl?: number;         // Lebensdauer pro Partikel (s)
    spreadDeg?: number;   // Override Streuung
    y?: number;           // 0..1 (relative Höhe); ignoriert originY range
  };

  function spawnFrom(side: 'left'|'right', count: number, power: number, ttl: number, sprDeg: number, ry?: number) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const x = side === 'left' ? -8 : w + 8;
    const yRel = ry ?? rand(originY.min, originY.max);
    const y = yRel * h;

    // Basiswinkel
    const base = side === 'left' ? 0 : Math.PI; // 0=nach rechts, PI=nach links
    const spr = (sprDeg * Math.PI) / 180;

    for (let i = 0; i < count; i++) {
      const ang = base + rand(-spr, spr) + (side === 'left' ? -0.25 : 0.25); // leicht schräg nach oben
      const v = power * rand(0.8, 1.15);
      const size = rand(particleSize.min, particleSize.max);

      particles.push({
        x,
        y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - rand(150, 280), // initialer Upkick
        rot: rand(0, Math.PI * 2),
        vr: rand(-6, 6),
        size,
        color: pick(colors),
        shape: (Math.random() * 3) | 0,
        life: 0,
        ttl
      });
    }
  }

  /** Trigger: feuert Kanonen
   *  - side: 'left' | 'right' | 'both'
   *  - opts: { count, power, ttl, spreadDeg, y }
   */
  export function fire(side: Side = 'both', opts: FireOpts = {}) {
    const count = Math.max(1, Math.floor(opts.count ?? (side === 'both' ? burstCount / 2 : burstCount)));
    const power = opts.power ?? 620;
    const ttl = opts.ttl ?? 2.2;
    const spr = opts.spreadDeg ?? spreadDeg;

    if (side === 'left' || side === 'both') spawnFrom('left', count, power, ttl, spr, opts.y);
    if (side === 'right' || side === 'both') spawnFrom('right', count, power, ttl, spr, opts.y);

    ensureLoop();
  }

  /** Sequenz-Helper: mehrere Salven nacheinander */
  export async function volley(n = 3, gapMs = 220, side: Side = 'both') {
    for (let i = 0; i < n; i++) {
      fire(side);
      // kleine Variation
      await new Promise(r => setTimeout(r, gapMs + Math.random() * 80));
    }
  }

  onMount(() => {
    const _ctx = canvas.getContext('2d');
    if (!_ctx) return;
    ctx = _ctx;
    resize();
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  });
</script>

<style>
  .wrap {
    position: absolute; /* overlay über deinem Spielbereich */
    inset: 0;
    pointer-events: none; /* blockiert keine Klicks */
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>

<div class="wrap" style={`z-index:${zIndex};`}>
  <canvas bind:this={canvas}></canvas>
</div>
