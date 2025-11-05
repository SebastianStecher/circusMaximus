<script lang="ts">
  /** Visual state: bolt turns blue when active */
  export let active = false;

  /** Disable interactions */
  export let disabled = false;

  /** Button size (outer ring) */
  export let size = 44;

  /** Speed factor to apply when fast mode is ON (e.g., 2, 3, 4 …) */
  export let factor: number = 2;

  export let normal: number = 60;

  /**
   * Numeric speed-up for animations/game loop.
   * Toggled between 1 and `factor` on click.
   */
  export let base: number = 1;

  /** Callback */
  export let onToggle: (
    next: boolean,
    meta?: { factor: number; base: number }
  ) => void | Promise<void> = () => {};

  const BLUE = '#27c0ff';

  function handleClick() {
    if (disabled) return;

    // toggle numeric speed as per your logic
    base = base === normal ? factor : normal;

    // active mirrors the same toggle (optional but typical)
    const next = base !== normal;
    active = next;

    onToggle(next, { factor, base: base });
  }
</script>

<button
  class="fast-btn {active ? 'on' : ''}"
  style={`--size:${size}px; --blue:${BLUE};`}
  role="switch"
  aria-checked={active}
  aria-label="Fast Play"
  title={(active ? 'Fast Play: ON ' : 'Fast Play: OFF ') + `(×${base})`}
  on:click={handleClick}
  disabled={disabled}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M13 2L3 14h7l-1 8 12-14h-7l1-6z" />
  </svg>
</button>

<style>
  .fast-btn {
    --ring: #ffffff;
    --icon: #ffffff;

    width: var(--size);
    height: var(--size);
    border-radius: 999px;
    border: 3px solid var(--ring);
    background: #0f1014;
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    color: var(--icon);
  }
  .fast-btn svg { width: calc(var(--size)*0.45); height: calc(var(--size)*0.45); fill: currentColor; }
  .fast-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .fast-btn:active:not(:disabled) { transform: translateY(0); }
  .fast-btn:focus-visible { outline: 0; box-shadow: 0 0 0 3px rgba(255,255,255,.15), 0 0 0 6px rgba(39,192,255,.35); }
  .fast-btn.on { --ring: var(--blue); --icon: var(--blue); }
  .fast-btn:disabled { opacity: .5; cursor: not-allowed; filter: grayscale(1); }
</style>
