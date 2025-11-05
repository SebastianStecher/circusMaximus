<script lang="ts">
  /** Bindable: number of rounds (0/null = not running) */
  export let selected: number | null = null;

  /** Picker options */
  export let options: number[] = [10, 25, 50, 100, 500, 1000];

  /** UI text */
  export let buttonLabel = 'Autoplay'; // kept for compatibility (unused on the icon)
  export let title = 'AUTOPLAY';

  /** Block starting a new autoplay (start button in modal) */
  export let startDisabled = false;

  /** Optional visual size of the round button (outer ring) */
  export let size = 44;

  /** Parent callback to kick things off */
  export let onStart: (count: number) => void | Promise<void> = () => {};

  // modal state + internal temp selection
  let open = false;
  let temp: number | null = null;

  // derived
  $: isActive = !!selected && selected > 0;

  const BLUE = '#27c0ff';

  function handleTrigger() {
    if (isActive) {
      // Clicking while active stops autoplay
      selected = 0; // parent sees autoCount=0 via bind
      return;
    }
    // open picker and prefill temp with last selection (if any)
    temp = selected && selected > 0 ? selected : null;
    open = true;
  }

  function close() { open = false; }
  function choose(n: number) { temp = n; }

  function handleStart() {
    if (temp == null || temp <= 0 || startDisabled) return;
    // now we actually set the bound value
    selected = temp;
    close();
    // kick off next frame
    requestAnimationFrame(() => Promise.resolve().then(() => onStart(selected!)));
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.currentTarget === e.target) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  // ⬇️ tiny portal action
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- round icon button: blue when active, click-to-stop when active -->
<button
  class="auto-btn {isActive ? 'on' : ''}"
  style={`--size:${size}px; --blue:${BLUE};`}
  role="switch"
  aria-checked={isActive}
  aria-label={isActive ? 'Stop Autoplay' : 'Start Autoplay'}
  title={isActive ? 'Autoplay running – click to stop' : 'Autoplay – click to choose rounds'}
  on:click={handleTrigger}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <!-- circular arrows -->
    <path d="M12 3a9 9 0 0 1 8.7 6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M21 5v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 21a9 9 0 0 1-8.7-6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M3 19v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <!-- play triangle -->
    <path d="M11 8l6 4-6 4V8z" fill="currentColor"/>
  </svg>
</button>

{#if open}
  <div class="backdrop" use:portal on:click={onBackdropClick}>
    <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="close" aria-label="Close" on:click={close}>✕</button>
      </div>

      <div class="grid">
        {#each options as n}
          <button
            type="button"
            class="opt {temp === n ? 'active' : ''}"
            aria-pressed={temp === n}
            on:click={() => choose(n)}
          >
            {n}
          </button>
        {/each}
      </div>

      <button class="start" disabled={temp == null || temp <= 0 || startDisabled} on:click={handleStart}>
        START
      </button>
    </div>
  </div>
{/if}

<style>
  .auto-btn {
    --ring: #ffffff;
    --icon: #ffffff;
    --bg: #0f1014;
    width: var(--size);
    height: var(--size);
    border-radius: 999px;
    border: 3px solid var(--ring);
    background: var(--bg);
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    color: var(--icon);
  }
  .auto-btn svg { width: calc(var(--size) * 0.5); height: calc(var(--size) * 0.5); }
  .auto-btn:hover { transform: translateY(-1px); }
  .auto-btn:active { transform: translateY(0); }
  .auto-btn:focus-visible { outline: 0; box-shadow: 0 0 0 3px rgba(255,255,255,.15), 0 0 0 6px rgba(39,192,255,.35); }
  .auto-btn.on { --ring: var(--blue); --icon: var(--blue); }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000; /* above HUD */
  }
  .modal {
    width: 360px; max-width: calc(100% - 32px);
    background: #121216; border: 2px solid #2c2560; border-radius: 14px;
    padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,.45); color: #eee;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 14px;
  }
  .modal-header h3 { margin: 0; font-weight: 800; letter-spacing: .08em; color: #27c0ff; }
  .close { position: absolute; right: 0; top: 0; border: none; background: transparent; color: #888; font-size: 18px; cursor: pointer; }
  .close:hover { color: #fff; }

  .grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0 18px;
  }
  .opt {
    height: 48px; border-radius: 10px; border: 2px solid #3d2a7a; background: #1a1822;
    color: #ddd; font-weight: 700; cursor: pointer;
    transition: transform .05s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .opt:hover { transform: translateY(-1px); }
  .opt.active { border-color: #27c0ff; box-shadow: 0 0 0 2px rgba(39,192,255,.25) inset; background: #222031; color: #fff; }

  .start {
    width: 100%; height: 44px; border-radius: 10px; border: none;
    background: #27c0ff; color: #101016; font-weight: 900; letter-spacing: .06em; cursor: pointer;
  }
  .start:disabled { cursor: not-allowed; opacity: .45; filter: grayscale(.3); }
</style>
