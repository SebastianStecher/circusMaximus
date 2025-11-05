<script lang="ts">
  import type { Difficulty } from '../math/types';

  export let difficulty: Difficulty = 'Easy';

  /** >0 = autoplay running → lock picker */
  export let autoCount: number = 0;

  /** Wenn false → genauso sperren wie bei Autoplay */
  export let canPlay: boolean = true;

  /** Button-Größe (vom Parent setzbar), Standard 44px */
  export let size: number = 44;

  const BLUE = '#27c0ff';

  // Gesperrt, wenn Autoplay läuft ODER canPlay=false
  $: locked = ((autoCount ?? 0) > 0) || !canPlay;

  function setDiff(d: Difficulty) {
    if (!locked) difficulty = d;
  }
</script>

<div class="picker" role="group" aria-label="Difficulty">
  <!-- EASY: one star -->
  <button
    class="round {difficulty === 'Easy' ? 'on' : ''}"
    style={`--size:${size}px; --blue:${BLUE};`}
    aria-pressed={difficulty === 'Easy'}
    title={locked ? 'Gesperrt' : 'Easy'}
    on:click={() => setDiff('Easy')}
    disabled={locked}
  >
    <div class="icon one">
      <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
    </div>
  </button>

  <!-- MEDIUM: two stars -->
  <button
    class="round {difficulty === 'Medium' ? 'on' : ''}"
    style={`--size:${size}px; --blue:${BLUE};`}
    aria-pressed={difficulty === 'Medium'}
    title={locked ? 'Gesperrt' : 'Medium'}
    on:click={() => setDiff('Medium')}
    disabled={locked}
  >
    <div class="icon two">
      <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
      <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
    </div>
  </button>

  <!-- HARD: three stars in inverted triangle -->
  <button
    class="round {difficulty === 'Hard' ? 'on' : ''}"
    style={`--size:${size}px; --blue:${BLUE};`}
    aria-pressed={difficulty === 'Hard'}
    title={locked ? 'Gesperrt' : 'Hard'}
    on:click={() => setDiff('Hard')}
    disabled={locked}
  >
    <div class="icon three">
      <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
      <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
      <svg class="star bottom" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
      </svg>
    </div>
  </button>

  <!-- EXTREME: skull -->
  <button
    class="round {difficulty === 'Extreme' ? 'on' : ''}"
    style={`--size:${size}px; --blue:${BLUE};`}
    aria-pressed={difficulty === 'Extreme'}
    title={locked ? 'Gesperrt' : 'Extreme'}
    on:click={() => setDiff('Extreme' as Difficulty)}
    disabled={locked}
  >
    <div class="icon skull">
      <svg class="skull" viewBox="0 0 24 24" aria-hidden="true">
        <!-- Schädel-Außenform -->
        <path d="M12 2c-4.4 0-8 3.4-8 7.6 0 2.6 1.3 4.9 3.3 6.3V18a2 2 0 0 0 2 2h.5c.8 0 1.5-.7 1.5-1.5V18h2v.5c0 .8.7 1.5 1.5 1.5h.5a2 2 0 0 0 2-2v-2.1C18.7 14.5 20 12.2 20 9.6 20 5.4 16.4 2 12 2z" fill="currentColor"/>
        <!-- Augenhöhlen -->
        <circle cx="9"  cy="10" r="1.6" style="fill:#0f1014"/>
        <circle cx="15" cy="10" r="1.6" style="fill:#0f1014"/>
        <!-- Zähne -->
        <rect x="10" y="13" width="1.2" height="2" rx=".2" style="fill:#0f1014"/>
        <rect x="12.8" y="13" width="1.2" height="2" rx=".2" style="fill:#0f1014"/>
      </svg>
    </div>
  </button>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .round {
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
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    color: var(--icon);
    overflow: visible;
  }
  .round:hover:not(:disabled) { transform: translateY(-1px); }
  .round:active:not(:disabled) { transform: translateY(0); }
  .round:focus-visible {
    outline: 0;
    box-shadow: 0 0 0 3px rgba(255,255,255,.15), 0 0 0 6px rgba(39,192,255,.35);
  }
  .round.on { --ring: var(--blue); --icon: var(--blue); }

  /* star sizing per layout */
  .icon.one .star   { width: calc(var(--size) * 0.42); height: calc(var(--size) * 0.42); }
  .icon.two {
    display: grid;
    grid-auto-flow: column;
    align-items: center;
    gap: calc(var(--size) * 0.10);
  }
  .icon.two .star   { width: calc(var(--size) * 0.30); height: calc(var(--size) * 0.30); }

  .icon.three {
    display: grid;
    grid-template-columns: 1fr 1fr;     /* two on top */
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: calc(var(--size) * 0.08);
    row-gap: calc(var(--size) * 0.02);
  }
  .icon.three .star { width: calc(var(--size) * 0.28); height: calc(var(--size) * 0.28); }
  .icon.three .bottom { grid-column: 1 / span 2; justify-self: center; }

  /* skull sizing */
  .icon.skull .skull { width: calc(var(--size) * 0.44); height: calc(var(--size) * 0.44); display:block; }

  .round:disabled { opacity: .55; cursor: not-allowed; filter: grayscale(1); }
</style>
