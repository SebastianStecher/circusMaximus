<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // ------- Public API -------
  export let colors: string[] = ['#ffd400', '#ff4d4d', '#4dd2ff', '#7dff7a', '#ffffff'];
  export let zIndex = 9999;
  export let gravity = 700;         // px/s^2
  export let airDrag = 0.985;       // 0..1 per frame
  export let wind = 0;              // px/s (+ rechts, - links)
  export let dprClamp = 2;          // max devicePixelRatio für Performance
  export let sparkSize = { min: 2, max: 4 };
  export let shellTrail = true;     // kleiner Glitzer während des Aufstiegs
  export let burstParticles = 180;  // Partikel pro Explosion
  export let allowStarShape = true; // zufällige Sternform-Bursts

  // ------- Internals -------
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = false;
  let lastT = 0;

  type Shell = {
    x: number; y: number;
    vx: number; vy: number;
    t: number;          // Zeit seit Start
    explodeT: number;   // Sek. bis Explosion
    color: string;
    alive: boolean;
  };

  type Spark = {
    x: number; y: number;
    vx: number; vy: number;
    life: number; ttl: number;
    rot: number; vr: number;
    size: number; color: string;
  };

  const shells: Shell[] = [];
  const sparks: Spark[] = [];

  function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
  function pick<T>(arr: T[]) { return arr[(Math.random() * arr.length) | 0]; }

  function resize() {
    const parent = canvas.parentElement ?? canvas;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    const dpr = Math.min(dprClamp, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureLoop() {
    if (!running) {
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  function maybeStop() {
    if (running && shells.length === 0 && sparks.length === 0) {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      ctx?.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  }

  function loop(now: number) {
    const dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Update shells (Aufstieg)
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.t += dt;
      s.vx = (s.vx + wind * dt) * airDrag;
      s.vy = (s.vy - gravity * dt) * airDrag; // nach oben = negative vy (Koords unten->oben)
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Trail
      if (shellTrail && Math.random() < 0.6) {
        sparks.push({
          x: s.x, y: s.y + 4,
          vx: rand(-20, 20), vy: rand(20, 60),
          life: 0, ttl: rand(0.15, 0.28),
          rot: rand(0, Math.PI * 2), vr: rand(-8, 8),
          size: rand(1.5, 2.5), color: s.color
        });
      }

      // zeichne Shell (kleiner Punkt)
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Explosion?
      if (s.t >= s.explodeT || s.vy >= 0) {
        explode(s);
        shells.splice(i, 1);
      }

      // Außerhalb?
      if (s.y < -40 || s.x < -60 || s.x > w + 60) {
        shells.splice(i, 1);
      }
    }

    // Update sparks (Explosion + Trails)
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vx = (p.vx + wind * dt) * airDrag;
      p.vy = (p.vy + gravity * dt) * airDrag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;

      const a = Math.max(0, 1 - p.life / p.ttl);
      if (p.life >= p.ttl || p.y > h + 60) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      // Mischung aus Rechteck & Kreis
      if (Math.random() < 0.5) {
        const s = p.size;
        ctx.fillRect(-s/2, -s/2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (shells.length > 0 || sparks.length > 0) {
      raf = requestAnimationFrame(loop);
    } else {
      maybeStop();
    }
  }

  // Explosion: radial (optional Sternform / Ring)
  function explode(s: Shell) {
    const w = canvas.clientWidth;
    const baseCount = burstParticles;
    const pattern = pick<'radial'|'ring'|'star'>(allowStarShape ? ['radial', 'ring', 'star'] : ['radial', 'ring']);
    const col = s.color;

    if (pattern === 'ring') {
      const count = Math.floor(baseCount * 0.6);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + rand(-0.03, 0.03);
        const spd = rand(250, 360);
        sparks.push({
          x: s.x, y: s.y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 0, ttl: rand(1.2, 1.8),
          rot: rand(0, Math.PI * 2), vr: rand(-10, 10),
          size: rand(sparkSize.min, sparkSize.max),
          color: col
        });
      }
    } else if (pattern === 'star') {
      // 5-Zack Stern
      const spikes = 5;
      const count = baseCount;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const ang = t * Math.PI * 2;
        const r = (Math.floor((t * spikes) % 1 * 2) === 0) ? rand(290, 370) : rand(140, 210);
        sparks.push({
          x: s.x, y: s.y,
          vx: Math.cos(ang) * r, vy: Math.sin(ang) * r,
          life: 0, ttl: rand(1.0, 1.7),
          rot: rand(0, Math.PI * 2), vr: rand(-9, 9),
          size: rand(sparkSize.min, sparkSize.max),
          color: pick([col, pick(colors)]) // etwas Farbe mischen
        });
      }
    } else {
      // radial wolkig
      const count = baseCount;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = rand(200, 420) * (0.7 + Math.random() * 0.6);
        sparks.push({
          x: s.x, y: s.y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 0, ttl: rand(1.2, 2.0),
          rot: rand(0, Math.PI * 2), vr: rand(-12, 12),
          size: rand(sparkSize.min, sparkSize.max),
          color: pick([col, pick(colors)])
        });
      }
    }

    // kleiner Kern-Flash
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --------- Public triggers ----------
  type FireOpts = {
    height?: number;    // 0..1 (relativ zur Canvas-Höhe), default 0.55..0.75
    power?: number;     // Startgeschwindigkeit nach oben (px/s)
    vx?: number;        // seitlicher Drift der Shell
    color?: string;     // Farbe der Explosion
    delayMs?: number;   // optionaler Start-Delay
  };

  /** Schießt genau eine Rakete aus der Mitte unten nach oben und explodiert */
  export async function fire(opts: FireOpts = {}) {
    if (opts.delayMs) await new Promise(r => setTimeout(r, opts.delayMs));
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const targetRel = opts.height ?? rand(0.55, 0.75);
    const explodeT = Math.max(0.6, targetRel * 1.2); // grobe Zeitabschätzung bis Zielhöhe
    const color = opts.color ?? pick(colors);

    shells.push({
      x: w / 2,
      y: h - 4,
      vx: opts.vx ?? rand(-40, 40),
      vy: -(opts.power ?? rand(600, 820)),
      t: 0,
      explodeT,
      color,
      alive: true
    });

    ensureLoop();
  }

  /** Mehrere Raketen nacheinander */
  export async function volley(n = 3, gapMs = 250) {
    for (let i = 0; i < n; i++) {
      fire({ height: rand(0.55, 0.8), power: rand(440, 560) });
      await new Promise(r => setTimeout(r, gapMs + Math.random() * 90));
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
    position: absolute;
    inset: 0;
    pointer-events: none; /* klicks passieren durch */
  }
  canvas { width: 100%; height: 100%; display: block; }
</style>

<div class="wrap" style={`z-index:${zIndex};`}>
  <canvas bind:this={canvas}></canvas>
</div>
