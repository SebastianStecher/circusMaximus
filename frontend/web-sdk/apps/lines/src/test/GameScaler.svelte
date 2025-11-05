<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  /** Deine Design-Größe (z.B. 1920x1080) */
  export let width  = 1920;
  export let height = 1080;

  /** Abstand zum Fensterrand */
  export let padding = 8;

  let scale = 1;
  let scaledW = width;
  let scaledH = height;

  function recompute() {
    const availW = Math.max(0, window.innerWidth  - padding * 2);
    const availH = Math.max(0, window.innerHeight - padding * 2);
    scale   = Math.min(availW / width, availH / height);
    scaledW = Math.floor(width  * scale);
    scaledH = Math.floor(height * scale);
  }

  onMount(() => {
    recompute();
    window.addEventListener('resize', recompute);
  });
  onDestroy(() => window.removeEventListener('resize', recompute));
</script>

<!-- Letterbox-Fläche -->
<div class="outer" style={`--pad:${padding}px`}>
  <!-- Box mit EXAKT der skalierten Zielgröße -->
  <div class="inner" style={`width:${scaledW}px; height:${scaledH}px`}>
    <!-- Dein Game in Designgröße, von 0/0 skaliert -->
    <div class="frame"
         style={`width:${width}px; height:${height}px; transform:scale(${scale});`}>
      <slot />
    </div>
  </div>
</div>

<style>
  .outer {
    position: fixed;
    inset: var(--pad);
    display: flex;
    align-items: center;
    justify-content: center;
    /* optional Hintergrund: background:#0f1624; */
  }

  /* Exakt die sichtbare Fläche in Zielgröße */
  .inner {
    position: relative;
    overflow: hidden;       /* sauber „eingefasst“ */
  }

  /* Dein Spiel-Root in Designgröße */
  .frame {
    position: absolute;
    left: 0; top: 0;
    transform-origin: top left; /* wichtig */
    will-change: transform;
  }
</style>
