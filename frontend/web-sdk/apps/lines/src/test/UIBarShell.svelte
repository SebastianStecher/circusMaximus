<script lang="ts">
  export let maxWidth = 1160;
  export let margin = 16;
  export let radius = 14;
  export let blur = 10;
  export let alpha = 0.78;
  export let placement: 'top' | 'bottom' = 'top';

  /** Visual height of the bar (px). The bar will NOT grow with content. */
  export let height = 56;

  /** Inner padding */
  export let paddingX = 14;
  export let paddingY = 10;
</script>

<div
  class="hud pos-{placement}"
  style="--mw:{maxWidth}px; --m:{margin}px; --r:{radius}px; --b:{blur}px; --a:{alpha};
         --h:{height}px; --px:{paddingX}px; --py:{paddingY}px;"
>
  <div class="bar"><slot /></div>
</div>

<style>
  .hud {
    position: absolute;
    left: var(--m);
    right: var(--m);
    display: flex;
    justify-content: center;
    z-index: 50;
    pointer-events: none;
  }
  .pos-top    { top:    calc(env(safe-area-inset-top, 0px) + var(--m)); }
  .pos-bottom { bottom: calc(env(safe-area-inset-bottom, 0px) + var(--m)); }

  .bar {
    pointer-events: auto;
    width: 100%;
    max-width: var(--mw);
    display: flex;
    align-items: center;
    gap: 12px;

    /* fixed shell height; content may overflow visually */
    height: var(--h);
    padding: var(--py) var(--px);
    overflow: visible;

    border-radius: var(--r);
    background: rgba(12,12,16,var(--a));
    backdrop-filter: blur(var(--b));
    -webkit-backdrop-filter: blur(var(--b));
    box-shadow: 0 10px 24px rgba(0,0,0,.35);
    outline: 1px solid rgba(255,255,255,.06);
  }
</style>
