<script lang="ts">
  export let multipliers: number[] = [1,2,4,1,2,4,1,2,4,1,2,4];
  export let visibleCount = 8;
  export let itemWidth  = 72;
  export let itemHeight = 40;
  export let gap        = 8;
  export let decimals   = 2;

  /** ✨ Neue Prop: Schriftgröße der Chips (px) */
  export let fontSize   = 16;

  const fmt = (m: number) =>
    `x${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(decimals)}`;

  // Optional: nur die letzten N rendern
  $: shown = multipliers.slice(-visibleCount);
</script>

<div
  class="strip"
  style={`--w:${itemWidth}px; --h:${itemHeight}px; --gap:${gap}px; --vis:${visibleCount}; --accent:#27c0ff; --fs:${fontSize}px;`}
>
  <ul class="row">
    {#each shown as m, i}
      {#key i}
        <li
          class="chip {m >= 1 ? 'win' : 'lose'} {i === shown.length - 1 ? 'newest' : ''}"
          title={(m >= 1 ? 'Win ' : 'Loss ') + fmt(m)}
          aria-label={(m >= 1 ? 'Win ' : 'Loss ') + fmt(m)}
        >
          <span>{fmt(m)}</span>
        </li>
      {/key}
    {/each}
  </ul>
</div>

<style>
  .strip{
    width: calc(var(--vis) * var(--w) + (var(--vis) - 1) * var(--gap));
    overflow: hidden;
  }

  .row{
    display: flex;
    align-items: center;
    gap: var(--gap);
    margin: 0;
    padding: 0;
    list-style: none;
    white-space: nowrap;
    justify-content: flex-end; /* newest on the right */
  }

  .chip{
    flex: 0 0 auto;
    width: var(--w);
    height: var(--h);
    display: inline-flex;
    align-items: center;
    justify-content: center;

    background: #1a1822;                  /* base */
    border: 2px solid #2c2560;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    color: #eee;

    font-weight: 800;
    font-size: var(--fs, 16px);  /* <- gesteuert über Prop */
    line-height: 1;
    letter-spacing: .02em;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }

  /* WIN: blue ring + gentle blue tint inside */
  .chip.win{
    border-color: var(--accent);
    background:
      linear-gradient(to bottom,
        color-mix(in oklab, var(--accent) 10%, transparent),
        color-mix(in oklab, var(--accent) 6%, transparent)
      ),
      #1a1822;
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--accent) 22%, transparent) inset,
      0 4px 14px rgba(0,0,0,.35);
    color: #fff;
  }

  /* losses etwas matter */
  .chip.lose { color: #d7d7de; }

  /* newest item: kleiner Pop */
  .chip.newest{
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--accent) 28%, transparent) inset,
      0 6px 16px rgba(0,0,0,.45);
    transform-origin: center;
    animation: pop .18s ease-out;
  }

  @keyframes pop{
    0% { transform: translateY(1px) scale(.96); }
    60%{ transform: translateY(-1px) scale(1.02); }
    100%{ transform: translateY(0) scale(1); }
  }
</style>
