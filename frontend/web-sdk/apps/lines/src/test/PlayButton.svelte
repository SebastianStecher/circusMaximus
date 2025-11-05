<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let autoCount: number | null = null;
  export let spinning = false;
  export let idlePlay = false;        // NEW: if true, don't show blue during spin
  export let size = 60;
  export let disabled = false;

  const BLUE = '#27c0ff';
  const RED  = '#e53935';

  const dispatch = createEventDispatcher();

  // derived flags
  $: isAuto = !!autoCount && autoCount > 0;
  $: activeSpin = spinning && !idlePlay;   // NEW: only blue when not idle

  function handleClick(event: MouseEvent) {
    if (disabled) return;
    if (isAuto) { autoCount = 0; return; }
    dispatch('click', event);
  }
</script>

<button
  class="play-btn {activeSpin ? 'spinning' : ''} {isAuto ? 'auto' : ''}"
  style={`--size:${size}px; --blue:${BLUE}; --red:${RED};`}
  role="button"
  aria-label={isAuto ? 'Stop Autoplay' : 'Play'}
  title={isAuto ? 'Autoplay running – click to stop' : (activeSpin ? 'Playing…' : 'Play')}
  on:click={handleClick}
  disabled={disabled}
>
  {#if isAuto}
    <span class="count">{autoCount}</span>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 1 8.7 6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M21 5v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 21a9 9 0 0 1-8.7-6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M3 19v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  {/if}
</button>

<style>
  .play-btn {
    --ring: #111;
    --icon: #111;
    --bg: #ffffff;
    width: var(--size);
    height: var(--size);
    border-radius: 999px;
    border: 3px solid var(--ring);
    background: var(--bg);
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    color: var(--icon);
  }

  .play-btn svg { width: calc(var(--size) * 0.58); height: calc(var(--size) * 0.58); }
  .play-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .play-btn:active:not(:disabled) { transform: translateY(0); }
  .play-btn:focus-visible {
    outline: 0;
    box-shadow: 0 0 0 3px rgba(0,0,0,.12), 0 0 0 6px rgba(39,192,255,.35);
  }

  /* Blue only when activeSpin is true */
  .play-btn.spinning { --icon: var(--blue); --ring: var(--blue); }

  /* Autoplay state */
  .play-btn.auto {
    --bg: var(--red);
    --ring: #ffffff;
    --icon: #ffffff;
    color: #ffffff;
  }
  .play-btn .count {
    font-weight: 900;
    font-size: calc(var(--size) * 0.38);
    line-height: 1;
    letter-spacing: .02em;
  }

  .play-btn:disabled { opacity: .55; cursor: not-allowed; filter: grayscale(.3); }
</style>
