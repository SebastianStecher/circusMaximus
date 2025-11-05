<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** Sichtbarkeit */
  export let open = false;

  /** 🔧 Button-Größe (Hamburger/X) */
  export let size = 44;

  /** Deaktivieren des Buttons */
  export let disabled = false;

  /** (legacy, ungenutzt) – wird durch panelFontSize ersetzt */
  export let fontSize = 20;

  /** 🔧 Popup-Größe */
  export let panelWidth = 260;     // min-Breite in px
  export let panelScale = 1.0;     // skalieren (z. B. 1.2 => 20% größer)

  /** 🔧 Schriftgröße im Popup (Info/Musik) */
  export let panelFontSize = 16;   // px

  /** Einziger Gesamt-Lautstärke-Wert (0..1) */
  export let music = 0.5;

  /** Stumm-Schalter */
  export let musicMuted = false;

  const BLUE = '#27c0ff';
  const dispatch = createEventDispatcher();

  function toggle() { if (!disabled) open = !open; }
  function close()  { open = false; }

  function onInfo() {
    dispatch('info');
    close();
  }

  function onMusic(e: Event) {
    const v = Math.max(0, Math.min(1, +(e.target as HTMLInputElement).value));
    music = v;
    dispatch('musicchange', v);
  }

  function toggleMute() {
    musicMuted = !musicMuted;
    dispatch('musicmutechange', musicMuted);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={onKey} />

<div
  class="root"
  style={`
    --size:${size}px;
    --blue:${BLUE};
    --panel-w:${panelWidth}px;
    --panel-scale:${panelScale};
    --panel-font:${panelFontSize}px;
  `}
>
  <!-- Toggle button: Hamburger ↔ X -->
  <button
    class="toggle {open ? 'on' : ''}"
    on:click={toggle}
    aria-expanded={open}
    aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
    disabled={disabled}
  >
    <!-- Burger (SVG) -->
    <svg class="bars" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="7"  x2="20" y2="7"  />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
    <!-- X -->
    <span class="x" aria-hidden="true">✕</span>
  </button>

  {#if open}
    <div class="backdrop" on:click={close} />

    <div class="panel" role="menu" aria-label="Seitmenü" on:click|stopPropagation>
      <!-- Info -->
      <button class="row" role="menuitem" on:click={onInfo}>
        <span class="ico">i</span>
        <span class="label">Info</span>
      </button>

      <!-- Audio (ein Regler + Mute) -->
      <div class="row audio" role="group" aria-label="Audio">
        <button
          class="ico spk"
          on:click={toggleMute}
          aria-pressed={musicMuted}
          title={musicMuted ? 'Stumm' : 'Stumm schalten'}
        >
          {musicMuted ? '🔇' : '🔊'}
        </button>
        <div class="sliders">
          <label>
            <span>Musik</span>
            <input
              type="range" min="0" max="1" step="0.01"
              bind:value={music}
              on:input={onMusic}
              disabled={musicMuted}
            />
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .root { position: relative; }

  /* Toggle */
  .toggle{
    --ring:#ffffff; --bg:#0f1014; --icon:#ffffff;
    width:var(--size); height:var(--size);
    border-radius:999px; border:3px solid var(--ring);
    background:var(--bg); color:var(--icon);
    display:grid; place-items:center; padding:0; cursor:pointer;
    box-shadow:0 4px 14px rgba(0,0,0,.35);
    transition:transform .06s ease, border-color .15s ease, color .15s ease;
    position:relative; z-index:110;
  }
  .toggle:hover:not(:disabled){ transform: translateY(-1px) }
  .toggle:disabled{ opacity:.5; cursor:not-allowed; filter:grayscale(1) }
  .toggle.on{ --ring:var(--blue); --icon:var(--blue) }

  /* Burger-Icon skaliert mit Button-Größe */
  .toggle .bars{
    width: calc(var(--size) * 0.58);
    height: calc(var(--size) * 0.58);
    display: block;
  }
  .toggle .bars line{
    stroke: currentColor;
    /* Strichbreite leicht mit skalieren */
    stroke-width: calc(var(--size) * 0.06);
    stroke-linecap: round;
  }

  /* Umschalten: Burger zeigen, X nur im offenen Zustand */
  .x{ display:none; font-size: calc(var(--size) * 0.45); line-height:1; }
  .toggle.on .bars{ display:none; }
  .toggle.on .x{ display:block; }

  .backdrop{ position:fixed; inset:0; z-index:90; background:transparent; }

  .panel{
    position:absolute;
    bottom: calc(100% + 20px);
    left: 0;
    min-width: var(--panel-w, 230px);
    background:#121216;
    color:#fff;
    border-radius:12px;
    box-shadow:0 12px 30px rgba(0,0,0,.45);
    outline: 1px solid rgba(255,255,255,.06);
    padding:10px 18px 10px 10px; /* extra rechts Luft */
    z-index:100;

    /* Skalierung + Schriftgröße zentral */
    transform: scale(var(--panel-scale, 1));
    transform-origin: bottom left;
    font-size: var(--panel-font, 16px);
  }

  .row{
    display:flex; align-items:center; gap:10px;
    width:100%; background:transparent; color:#fff;
    border:0; padding:8px 12px; border-radius:10px; cursor:pointer; text-align:left;
  }
  .row + .row{ margin-top:6px }
  .row:hover{ background:#1a1822 }
  .row.audio{ cursor:default; }
  .row.audio:hover{ background:transparent }

  /* Kreis-Icons (Info & Speaker) — skalieren leicht mit Schriftgröße im Panel */
  .ico{
    --ico: calc(var(--panel-font, 16px) * 1.75);
    width: var(--ico);
    height: var(--ico);
    border-radius: 999px;
    background:#0f1014;
    color:#fff;
    border:2px solid rgba(255,255,255,.12);
    display: grid;
    place-items: center;
    line-height: 1;
    flex: 0 0 var(--ico);
    font-size: calc(var(--panel-font, 16px) * 0.95);
  }

  .label{ letter-spacing:.06em;  color:#fff; }

  .sliders{ display:flex; flex-direction:column; gap:8px; width:100%; padding-right: 10px; }
  .sliders label{
    display:grid; grid-template-columns:56px 1fr; align-items:center; gap:10px;
  }
  .sliders label span{ color:#fff; font-weight:600; font-size: calc(var(--panel-font, 16px) * 0.9); }
  .sliders input[type="range"]{ width:100%; accent-color:#27c0ff; }
  .sliders input[disabled]{ opacity:.5; }

  .spk{ cursor:pointer; }
</style>
