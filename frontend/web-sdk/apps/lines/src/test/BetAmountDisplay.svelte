<script lang="ts">
  /** INPUTS (all MINOR units except currency) */
  export let amount: number;             // e.g., 2_000_000 = $2.00
  export let betLevels: number[] = [];   // allowed bets (MINOR), unsorted OK
  export let autoCount = 0;              // >0 locks UI
  export let currency: string = 'USD';
  export let label = 'Play amount';
  export let locale = 'en-US';

  /* === 🔧 UI Controls (vom Parent setzbar) === */
  export let boxMinWidth: number = 120;
  export let panelPadTop: number = 8;
  export let panelPadX: number = 10;
  export let panelPadBottom: number = 14;

  export let labelFontSize: number = 11;
  export let valueFontSize: number = 18;

  export let chevronWidth: number = 36;
  export let chevronHeight: number = 32;

  export let gap: number = 10;
  export let progressHeight: number = 6;

  export let popoverWidth: number = 360;
  export let levelHeight: number = 44;

  // ---- Constants / helpers
  const API_MULTIPLIER = 1_000_000;

  type Currency =
    | 'USD' | 'CAD' | 'JPY' | 'EUR' | 'RUB' | 'CNY' | 'PHP' | 'INR' | 'IDR' | 'KRW'
    | 'BRL' | 'MXN' | 'DKK' | 'PLN' | 'VND' | 'TRY' | 'CLP' | 'ARS' | 'PEN' | 'XGC' | 'XSC';

  const CurrencyMeta: Record<
    Currency,
    { symbol: string; decimals: number; symbolAfter?: boolean }
  > = {
    USD: { symbol: '$',   decimals: 2 },
    CAD: { symbol: 'CA$', decimals: 2 },
    JPY: { symbol: '¥',   decimals: 0 },
    EUR: { symbol: '€',   decimals: 2 },
    RUB: { symbol: '₽',   decimals: 2 },
    CNY: { symbol: 'CN¥', decimals: 2 },
    PHP: { symbol: '₱',   decimals: 2 },
    INR: { symbol: '₹',   decimals: 2 },
    IDR: { symbol: 'Rp',  decimals: 0 },
    KRW: { symbol: '₩',   decimals: 0 },
    BRL: { symbol: 'R$',  decimals: 2 },
    MXN: { symbol: 'MX$', decimals: 2 },
    DKK: { symbol: 'KR',  decimals: 2, symbolAfter: true },
    PLN: { symbol: 'zł',  decimals: 2, symbolAfter: true },
    VND: { symbol: '₫',   decimals: 0, symbolAfter: true },
    TRY: { symbol: '₺',   decimals: 2 },
    CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
    ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
    PEN: { symbol: 'S/',  decimals: 2, symbolAfter: true },
    XGC: { symbol: 'GC',  decimals: 2 },
    XSC: { symbol: 'SC',  decimals: 2 },
  };

  function toMajor(minor: number) {
    const n = Number.isFinite(minor) ? minor : 0;
    return n / API_MULTIPLIER;
  }
  function fmtMajor(nMajor: number) {
    const meta = CurrencyMeta[currency as Currency] ?? {
      symbol: currency, decimals: 2, symbolAfter: true
    };
    const amt = (Number.isFinite(nMajor) ? nMajor : 0).toLocaleString(locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
      useGrouping: true
    });
    return meta.symbolAfter ? `${amt} ${meta.symbol}` : `${meta.symbol}${amt}`;
  }

  // state
  let open = false;

  export let canPlay: boolean = true;

  // derived, sorted & unique
  $: levels = Array.from(new Set(betLevels ?? [])).sort((a, b) => a - b);

  // lock & canInc/Dec computed from levels
  $: isLocked = autoCount > 0 || levels.length === 0 || !canPlay;
  $: idx = nearestIndex(amount, levels);
  $: canDec = !isLocked && idx > 0;
  $: canInc = !isLocked && idx < levels.length - 1;

  // progress (0..1) across levels; if single level → 1
  $: progress = levels.length <= 1 ? 1 : idx / (levels.length - 1);

  function nearestIndex(val: number, arr: number[]) {
    if (!arr || arr.length === 0) return 0;
    const i = arr.indexOf(val);
    if (i !== -1) return i;
    let bestI = 0, bestD = Math.abs(val - arr[0]);
    for (let k = 1; k < arr.length; k++) {
      const d = Math.abs(val - arr[k]);
      if (d < bestD) { bestD = d; bestI = k; }
    }
    return bestI;
  }

  function openPicker() { if (!isLocked) open = true; }
  function closePicker() { open = false; }

  function choose(lvl: number) { amount = lvl; closePicker(); }
  function increase() { if (canInc) amount = levels[idx + 1]; }
  function decrease() { if (canDec) amount = levels[idx - 1]; }

  function onBackdropClick(e: MouseEvent) {
    if (e.currentTarget === e.target) closePicker();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closePicker();
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.parentNode?.removeChild(node); } };
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- CSS-Variablen aus Props injizieren -->
<div
  class="bet"
  style={`
    --gap:${gap}px;
    --box-minw:${boxMinWidth}px;
    --pad-top:${panelPadTop}px;
    --pad-x:${panelPadX}px;
    --pad-bottom:${panelPadBottom}px;

    --label-fs:${labelFontSize}px;
    --value-fs:${valueFontSize}px;

    --chev-w:${chevronWidth}px;
    --chev-h:${chevronHeight}px;

    --progress-h:${progressHeight}px;

    --popover-w:${popoverWidth}px;
    --level-h:${levelHeight}px;
  `}
>
  <div class="panel">
    <div class="label">{label}</div>
    <button
      class="value"
      on:click={openPicker}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={isLocked ? 'Locked during autoplay' : 'Click to change bet'}
      disabled={isLocked}
    >
      {fmtMajor(toMajor(amount))}
    </button>

    <!-- bottom progress -->
    <div class="progress">
      <div class="bar" style={`--p:${progress};`} />
    </div>
  </div>

  <div class="chevrons">
    <button class="chev" on:click={increase} disabled={!canInc} aria-label="Increase bet">
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 15l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button class="chev" on:click={decrease} disabled={!canDec} aria-label="Decrease bet">
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 9l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</div>

{#if open}
  <div class="backdrop" use:portal on:click={onBackdropClick}>
    <div class="popover" role="dialog" aria-modal="true" aria-label="Bet levels">
      <div class="popover-head">
        <strong>{label}</strong>
        <button class="close" aria-label="Close" on:click={closePicker}>✕</button>
      </div>
      <div class="levels">
        {#each levels as lvl}
          <button
            type="button"
            class="level {amount === lvl ? 'active' : ''}"
            aria-pressed={amount === lvl}
            on:click={() => choose(lvl)}
          >
            {fmtMajor(toMajor(lvl))}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .bet {
    display:flex;
    align-items:center;
    gap: var(--gap, 10px);
  }

  .panel {
    position: relative;
    min-width: var(--box-minw, 120px);
    padding: var(--pad-top, 8px) var(--pad-x, 10px) var(--pad-bottom, 14px);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.8);
  }

  .label {
    font-size: var(--label-fs, 11px);
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #39c7ff;
    margin-bottom: 2px;
  }

  .value {
    font-weight: 800;
    font-size: var(--value-fs, 18px);
    color: #fff;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }
  .value:disabled { opacity:.65; cursor:not-allowed; }

  .progress {
    position:absolute;
    left:8px; right:8px; bottom:6px;
    height: var(--progress-h, 6px);
    border-radius: 999px;
    background: rgba(255,255,255,.12);
    overflow:hidden;
  }
  .progress .bar {
    height:100%;
    width: calc(var(--p) * 100%);
    background: #ffffff;
    opacity: .9;
    border-radius: 999px;
    transition: width .12s ease-out;
  }

  .chevrons {
    display:flex;
    flex-direction:column;
    gap:6px;
  }
  .chev {
    width: var(--chev-w, 36px);
    height: var(--chev-h, 32px);
    border-radius: 8px;
    border: 0;
    background: rgb(0, 0, 0);
    color:#ffffff;
    cursor: pointer;
  }
  .chev:disabled { opacity:.45; cursor:not-allowed; filter:grayscale(1); }

  /* Popover */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0,0,0,.35);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .popover {
    width: var(--popover-w, 360px);
    max-width: calc(100% - 32px);
    max-height: 70vh;
    overflow: hidden;
    background: #121216;
    border: 2px solid #2c2560;
    border-radius: 14px;
    padding: 14px;
    color: #eee;
    box-shadow: 0 12px 40px rgba(0,0,0,.45);
  }
  .popover-head {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 8px;
  }
  .popover-head strong { color: #27c0ff; letter-spacing: .08em; }
  .close {
    position: absolute; right: 0; top: 0;
    border: none; background: transparent; color: #888; font-size: 18px; cursor: pointer;
  }
  .close:hover { color: #fff; }

  .levels {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    max-height: 56vh;
    overflow: auto;
    padding: 6px 2px 2px;
  }
  .level {
    height: var(--level-h, 44px);
    border-radius: 10px;
    border: 2px solid #3d2a7a;
    background: #1a1822;
    color: #ddd;
    font-weight: 800;
    cursor: pointer;
    transition: transform .05s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .level:hover { transform: translateY(-1px); }
  .level.active {
    border-color: #27c0ff;
    box-shadow: 0 0 0 2px rgba(39,192,255,.25) inset;
    background: #222031;
    color: #fff;
  }
</style>
