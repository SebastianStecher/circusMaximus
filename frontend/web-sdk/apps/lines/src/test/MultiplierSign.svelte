<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // ------------- F1 Theme (Timing Board / LED-Style) -------------
  const THEME = {
    panelTop:    '#0b0b0f',
    panelBottom: '#1a1a1f',
    panelBorder: '#2b2b2f',
    textColor:   '#ffd400',
    shadow:      'rgba(0,0,0,0.35)',
    screw:       '#5c5c60',
  };

  // ---------------- Props ----------------
  export let text: string = 'x1.00';
  export let place: 1 | 2 | 3 | 4 | 'DNF' | null = null;
  export let multiplier: number | null = null;
  export let suffix: string = 'x';
  export let decimals: 'auto' | number = 'auto';

  export let dotMatrix: boolean = true;
  export let bezel: boolean = true;
  export let screwCorners: boolean = true;

  // World/Three-Mode Placement
  export let pos: [number, number, number] = [0, 1.8, 0];
  export let rot: [number, number, number] = [0, 0, 0];
  export let height = 0.7;
  export let visible: boolean = true;
  export let pulseKey = 0;
  export let parent: 'env' | 'game' = 'game';
  export let billboard: boolean = true;

  // 🔁 DOM-Fallback-Mode (wenn kein Three-Context vorhanden)
  export let domX = 40;               // px relativ zum nächstgelegenen positioned ancestor
  export let domY = 40;               // px
  export let domHeight = 120;         // px (Skalierung des Panels)
  export let domZ = 1000;             // z-index
  export let domAnchor: 'tl'|'tc'|'tr'|'cl'|'cc'|'cr'|'bl'|'bc'|'br' = 'tl';

  // ✅ Neu: DOM explizit erzwingen + Styling-Hooks für den Host
  export let useDom: boolean = false; // true → Three wird ignoriert, DOM-Overlay verwenden
  export let domClass: string = '';   // CSS-Klasse am DOM-Host
  export let domStyle: string = '';   // zusätzliche Inline-Styles am DOM-Host

  // ---------------- Shared scene context ----------------
  type Shared = {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    register: (fn: (dt:number,t:number)=>void) => () => void;
    gameGroup: THREE.Group;
    ready?: () => Promise<void>;
  };

  // Context / Prop-Fallbacks
  export let sharedKey: string | null = null;
  export let scene: THREE.Scene | null = null;
  export let camera: THREE.PerspectiveCamera | null = null;
  export let gameGroup: THREE.Group | null = null;
  export let register: ((fn: (dt:number,t:number)=>void) => () => void) | null = null;

  function resolveShared(): Shared | null {
    // ✅ Neu: DOM-Modus erzwingen
    if (useDom) return null;

    if (sharedKey) {
      const s = getContext(sharedKey) as Shared | undefined;
      if (s) return s;
    }
    const CANDIDATES = ['three-shared','env-shared','race-shared','lanerunner-shared','track-shared'];
    for (const k of CANDIDATES) {
      const s = getContext(k) as Shared | undefined;
      if (s) return s;
    }
    if (scene && camera && register) {
      return { scene, camera, register, gameGroup: gameGroup ?? new THREE.Group() };
    }
    return null;
  }

  let shared: Shared | null = null;

  // ---------- Anzeige-Text ----------
  function fmtNum(n: number, d: 'auto' | number): string {
    if (d === 'auto') return Number.isInteger(n) ? String(n) : String(n);
    return n.toFixed(d).replace(/\.?0+$/, '');
  }

  // ✅ Änderung: Wenn place === null → leerer Text (kein Text anzeigen)
  $: displayText =
    place === null
      ? ''
      : (place != null && multiplier != null
          ? `${place === 'DNF' ? 'DNF' : `P${place}`}: ${fmtNum(multiplier, decimals)}${suffix}`
          : text);

  // ---------- THREE Variante ----------
  const root = new THREE.Group();
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let unregister: (() => void) | null = null;
  let lastPulseKey = 0;
  let pulseStart = -1;

  // ---- Reaktivität für pos erzwingen (egal ob mutativ oder neues Array) ----
  let __posKey = '';
  $: __posKey = `${pos[0]}|${pos[1]}|${pos[2]}`;

  // Wenn shared aktiv ist, jede sichtbare Änderung an pos unmittelbar anwenden
  $: if (shared && __posKey) {
    if (root) {
      const [px, py, pz] = pos;
      if (root.position.x !== px || root.position.y !== py || root.position.z !== pz) {
        root.position.set(px, py, pz);
      }
    }
  }

  function makeTexture(w = 1024, h = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    if (!c) return { tex: null as any, ctx: null as any };
    drawSign(c, displayText);
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    return { tex: t, ctx: c };
  }

  // ---------- DOM-Fallback ----------
  let domHost: HTMLDivElement | null = null;
  let domCanvas: HTMLCanvasElement | null = null;
  let domCtx: CanvasRenderingContext2D | null = null;

  function ensureDomCanvas() {
    if (!domCanvas) {
      domCanvas = document.createElement('canvas');
      domCanvas.width = 1024;
      domCanvas.height = 512;
      domCtx = domCanvas.getContext('2d');
      if (domCtx) {
        drawSign(domCtx, displayText);
      }
      if (domHost) domHost.appendChild(domCanvas);
    }
    layoutDomCanvas();
  }

  function layoutDomCanvas() {
    if (!domHost || !domCanvas) return;
    // Größe
    const scale = domHeight / 512;
    domCanvas.style.width = `${1024 * scale}px`;
    domCanvas.style.height = `${domHeight}px`;

    // Anchor/Position
    const w = 1024 * scale;
    const h = domHeight;
    let tx = domX, ty = domY;
    if (domAnchor.includes('c')) tx -= w / 2;
    if (domAnchor.includes('r')) tx -= w;
    if (domAnchor.startsWith('c')) ty -= h / 2;
    if (domAnchor.startsWith('b')) ty -= h;

    domHost.style.left = `${Math.round(tx)}px`;
    domHost.style.top = `${Math.round(ty)}px`;
    domHost.style.zIndex = String(domZ);
  }

  // ---------- Render-Routine (beide Modi) ----------
  function drawSign(c: CanvasRenderingContext2D, t: string) {
    const W = c.canvas.width, H = c.canvas.height;
    c.clearRect(0, 0, W, H);

    // Panel mit Shadow
    c.save();
    c.shadowColor = THEME.shadow;
    c.shadowBlur = 30;
    c.shadowOffsetY = 8;

    roundRect(c, 32, 32, W-64, H-64, 40);
    const grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, THEME.panelTop);
    grad.addColorStop(1, THEME.panelBottom);
    c.fillStyle = grad;
    c.fill();
    c.restore();

    if (bezel) {
      c.lineWidth = 8;
      c.strokeStyle = THEME.panelBorder;
      roundRect(c, 32, 32, W-64, H-64, 40);
      c.stroke();
    }

    if (screwCorners) {
      const r = 10, pad = 42;
      const pts: Array<[number, number]> = [
        [32+pad, 32+pad], [W-32-pad, 32+pad],
        [32+pad, H-32-pad], [W-32-pad, H-32-pad],
      ];
      c.fillStyle = THEME.screw;
      for (const [x,y] of pts) {
        c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
        c.beginPath(); c.moveTo(x-5, y); c.lineTo(x+5, y);
        c.strokeStyle = '#3a3a3f'; c.lineWidth = 2; c.stroke();
      }
    }

    // Carbon
    c.save(); c.globalAlpha = 0.08; drawCarbon(c, 32, 32, W-64, H-64, 8); c.restore();

    // ✅ NEU: Wenn kein Text, nur Panel anzeigen und abbrechen
    if (!t) return;

    const centerX = W/2, centerY = H/2 + 6;

    if (!dotMatrix) {
      c.fillStyle = THEME.textColor;
      c.font = 'bold 180px system-ui, Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.18)';
      c.shadowBlur = 8;
      c.shadowOffsetY = 4;
      c.fillText(t, centerX, centerY);
      c.restore();
      return;
    }

    // Dot-Matrix
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    const mc = mask.getContext('2d')!;
    mc.fillStyle = '#fff';
    mc.font = 'bold 180px system-ui, Arial, sans-serif';
    mc.textAlign = 'center';
    mc.textBaseline = 'middle';
    mc.fillText(t, centerX, centerY);

    const dots = document.createElement('canvas'); dots.width = W; dots.height = H;
    const dc = dots.getContext('2d')!;
    const spacing = 14, dotR = 4.2;
    dc.fillStyle = THEME.textColor;
    for (let y = 80; y < H-80; y += spacing) {
      for (let x = 80; x < W-80; x += spacing) {
        dc.beginPath(); dc.arc(x, y, dotR, 0, Math.PI*2); dc.fill();
      }
    }
    dc.globalCompositeOperation = 'destination-in';
    dc.drawImage(mask, 0, 0);

    c.save();
    c.shadowColor = 'rgba(0,0,0,0.30)';
    c.shadowBlur = 10;
    c.shadowOffsetY = 4;
    c.drawImage(dots, 0, 0);
    c.restore();
  }

  function roundRect(c:CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number){
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+rr, y);
    c.arcTo(x+w, y,   x+w, y+h, rr);
    c.arcTo(x+w, y+h, x,   y+h, rr);
    c.arcTo(x,   y+h, x,   y,   rr);
    c.arcTo(x,   y,   x+w, y,   rr);
    c.closePath();
  }
  function drawCarbon(c:CanvasRenderingContext2D, x:number,y:number,w:number,h:number,size:number){
    c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
    for (let i = 0; i < w + h; i += size*2) {
      c.fillStyle = '#1b1b20'; c.fillRect(x + i, y, size, h);
      c.fillStyle = '#121216'; c.fillRect(x, y + i, w, size);
    }
    c.restore();
  }

  // ---------- Reactivity ----------
  let lastDrawn = '';
  let lastDotMatrix = dotMatrix;
  $: {
    // THREE
    if (ctx && tex && (displayText !== lastDrawn || dotMatrix !== lastDotMatrix || bezel || screwCorners)) {
      drawSign(ctx, displayText); tex.needsUpdate = true;
      lastDrawn = displayText; lastDotMatrix = dotMatrix;
    }
    // DOM
    if (domCtx && domCanvas && (displayText !== lastDrawn || dotMatrix !== lastDotMatrix || bezel || screwCorners)) {
      drawSign(domCtx, displayText);
      lastDrawn = displayText; lastDotMatrix = dotMatrix;
    }
  }

  $: if (pulseKey !== lastPulseKey) { lastPulseKey = pulseKey; pulseStart = performance.now(); }
  $: root.visible = visible;
  $: if (billboard && shared?.camera && root) { root.quaternion.copy(shared.camera.quaternion); }

  // ---------- Mount ----------
  onMount(async () => {
    shared = resolveShared();

    if (shared) {
      if ((!shared.scene || !shared.camera) && shared.ready) await shared.ready();

      const { tex: t, ctx: c } = makeTexture(1024, 512);
      tex = t; ctx = c;

      const aspect = tex.image.width / tex.image.height; // 2.0
      const width = height * aspect;

      const geo = new THREE.PlaneGeometry(width, height);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, toneMapped: false,
        side: THREE.DoubleSide, depthTest: false, depthWrite: false
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 999;

      root.add(mesh);
      root.position.set(...pos);
      root.rotation.set(...rot);

      (parent === 'game' ? shared.gameGroup : shared.scene).add(root);

      const reg = shared.register ?? register;
      if (reg) {
        unregister = reg((dt, now) => {
          // 1) Puls-Animation
          if (pulseStart >= 0 && mesh) {
            const t = (now - pulseStart) / 600;
            if (t < 1) {
              const s = 1 + 0.15 * Math.sin(Math.PI * Math.min(t, 1));
              mesh.scale.set(s, s, 1);
            } else {
              mesh.scale.set(1, 1, 1);
              pulseStart = -1;
            }
          }

          // 2) Positions-/Rotations-Sync JEDES FRAME
          if (root) {
            const [px, py, pz] = pos;
            if (root.position.x !== px || root.position.y !== py || root.position.z !== pz) {
              root.position.set(px, py, pz);
            }

            if (billboard && shared?.camera) {
              root.quaternion.copy(shared.camera.quaternion);
            } else {
              const [rx, ry, rz] = rot;
              if (root.rotation.x !== rx || root.rotation.y !== ry || root.rotation.z !== rz) {
                root.rotation.set(rx, ry, rz);
              }
            }
          }
        });
      }

    } else {
      // 👉 DOM-Fallback initialisieren (auch wenn useDom=true)
      ensureDomCanvas();
      lastDrawn = ''; // force redraw next reactive cycle
    }
  });

  onDestroy(() => {
    unregister?.();
    if (root.parent) root.parent.remove(root);
    mesh?.geometry?.dispose?.();
    (mesh?.material as any)?.map?.dispose?.();
    mesh?.material?.dispose?.();
    // DOM: Canvas entfernen
    if (domCanvas && domCanvas.parentElement) domCanvas.parentElement.removeChild(domCanvas);
    domCanvas = null; domCtx = null;
  });

  // ---------- Live-Updates ----------
  $: if (shared) {
    root.position && root.position.set(...pos);
    root.rotation && root.rotation.set(...rot);
    if (mesh && tex) {
      const aspect = tex.image.width / tex.image.height;
      const width = height * aspect;
      const newGeo = new THREE.PlaneGeometry(width, height);
      mesh.geometry.dispose();
      mesh.geometry = newGeo;
    }
  } else {
    // DOM-Layout aktualisieren
    layoutDomCanvas();
  }
</script>

<!-- DOM-Fallback Host (wird ignoriert, wenn Three-Mode aktiv ist) -->
<div
  bind:this={domHost}
  class={domClass}
  style={`position:absolute; left:0; top:0; pointer-events:none; z-index:${domZ}; ${domStyle}`}
></div>
