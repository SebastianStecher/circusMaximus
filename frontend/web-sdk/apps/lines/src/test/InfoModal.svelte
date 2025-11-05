<script lang="ts">
  /** Visibility */
  export let open = false;

  export let fontSize = 20;

  /**
   * Optional: Emojis für die Items innerhalb einer Reihe.
   * (Index bezieht sich auf die Position innerhalb der jeweiligen P*-Reihe.)
   * Wenn leer, werden farbige Punkte angezeigt.
   */
  export let fruitEmojis: string[] = [];

  /** Footer note */
  export let rtpNote =
    'Easy: theoretical RTP of 96.41%\nMedium: theoretical RTP of 96.19%\nHard: theoretical RTP of 96.18%\nExtreme: theoretical RTP of 95.99%';

  export let disclaimer =
    'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2025 Stake Engine.';

  import { createEventDispatcher } from 'svelte';
  import type { Difficulty } from '../math/types';
  import { MULTIPLIER_TABLE } from './placements';

  const dispatch = createEventDispatcher();
  const BLUE = '#27c0ff';

  function close(){ open = false; dispatch('close'); }
  function onBackdrop(e: MouseEvent){ if (e.currentTarget === e.target) close(); }
  function onKey(e: KeyboardEvent){ if (open && e.key === 'Escape') close(); }

  const dotColors = ['#13394b'];

  /** Format-Helfer: x10 / x1.40 / x0.19 */
  const fmt = (m:number) => `x${Number.isInteger(m) ? m.toFixed(0) : m.toString()}`;

  /** Reihenfolge der Plätze für die Darstellung */
  const PLACE_ORDER = ['P1','P2','P3','P4','DNF'] as const;

  /** Reihenfolge der Difficulties für die Darstellung */
  const DIFFS: Difficulty[] = ['Easy','Medium','Hard','Extreme'];
</script>

<svelte:window on:keydown={onKey} />

{#if open}
  <div class="backdrop" on:click={onBackdrop} >
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="info-title"
             style={`--blue:${BLUE};`} on:click|stopPropagation>
      <header class="head">
        <h2 id="info-title">INFORMATION</h2>
        <button class="close" aria-label="Close" on:click={close}>✕</button>
      </header>

      <div class="body" style={`--body-fs:${fontSize}px;`}>
        <h3>ABOUT THE GAME</h3>
        <p>
          Click the play button to start the race. You will get a multiplier based on the outcome of the race. Choose a difficulty
          and optionally use Autoplay and Fast Play. Your play amount can be adjusted in the play amount panel.
        </p>

        <h3>RTP of Game Modes</h3>
        <p class="rtp">{rtpNote}</p>

        <h3>GAME MODES</h3>

        {#each DIFFS as diff}
          <div class="mode" style={`--mode-fs:${fontSize}px;`}>
            <div class="mode-title">{diff} :</div>

            {#each PLACE_ORDER as placeKey}
              <div class="place-row">
                <div class="place-label">{placeKey}</div>
                <ul class="legend">
                  {#each MULTIPLIER_TABLE[diff][placeKey] as m, i}
                    <li>
                      {#if fruitEmojis[i]}
                        <span class="emoji" aria-hidden="true">{fruitEmojis[i]}</span>
                      {:else}
                        <span class="dot" style={`--c:${dotColors[i % dotColors.length]}`} />
                      {/if}
                      <span class="txt">{fmt(m)}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/each}

        <h3>HOW TO PLAY</h3>
        <ul class="how" style={`--how-fs:${fontSize}px;`}>
        <!-- Settings (hamburger) -->
        <li class="how-row">
            <span class="ico ico-round-dark" aria-hidden="true">
            <!-- hamburger -->
            <svg viewBox="0 0 24 24">
                <line x1="5" y1="8"  x2="19" y2="8"  />
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="5" y1="16" x2="19" y2="16" />
            </svg>
            </span>
            <span class="how-txt">Click to open the settings window to manage sound and view information</span>
        </li>

        <!-- Difficulty buttons (stacked) -->
        <li class="how-row">
          <span class="round demo" style="--size:30px">
            <div class="icon one">
              <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
              </svg>
            </div>
          </span>
          <span class="how-txt">Game Mode Easy</span>
        </li>

        <li class="how-row">
          <span class="round demo" style="--size:30px">
            <div class="icon two">
              <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
              </svg>
              <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
              </svg>
            </div>
          </span>
          <span class="how-txt">Game Mode Medium</span>
        </li>

        <li class="how-row">
          <span class="round demo" style="--size:30px">
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
          </span>
          <span class="how-txt">Game Mode Hard</span>
        </li>

        <li class="how-row">
          <span class="round demo" style="--size:30px">
            <div class="icon skull">
              <svg class="skull" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2c-4.4 0-8 3.4-8 7.6 0 2.6 1.3 4.9 3.3 6.3V18a2 2 0 0 0 2 2h.5c.8 0 1.5-.7 1.5-1.5V18h2v.5c0 .8.7 1.5 1.5 1.5h.5a2 2 0 0 0 2-2v-2.1C18.7 14.5 20 12.2 20 9.6 20 5.4 16.4 2 12 2z" fill="currentColor"/>
                <circle cx="9"  cy="10" r="1.6" style="fill:#0f1014"/>
                <circle cx="15" cy="10" r="1.6" style="fill:#0f1014"/>
                <rect x="10" y="13" width="1.2" height="2" rx=".2" style="fill:#0f1014"/>
                <rect x="12.8" y="13" width="1.2" height="2" rx=".2" style="fill:#0f1014"/>
              </svg>
            </div>
          </span>
          <span class="how-txt">Game Mode Extreme</span>
        </li>

        <!-- Autoplay -->
        <li class="how-row">
            <span class="ico ico-round-dark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M12 3a9 9 0 0 1 8.7 6.6" fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M21 5v5h-5"            fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M12 21a 9 9 0 0 1-8.7-6.6" fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M3 19v-5h5"             fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M11 8l6 4-6 4V8z" fill="currentColor"/>
            </svg>
            </span>
            <span class="how-txt">Click to set the number of rounds for automated play</span>
        </li>

        <!-- Play -->
        <li class="how-row">
            <span class="ico ico-round-white" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <!-- just the circular arrows silhouette, same as your button -->
                <path d="M12 3a9 9 0 0 1 8.7 6.6" fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M21 5v5h-5"              fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M12 21a 9 9 0 0 1-8.7-6.6" fill="none" stroke-linecap="round" stroke-width="2"/>
                <path d="M3 19v-5h5"               fill="none" stroke-linecap="round" stroke-width="2"/>
            </svg>
            </span>
            <span class="how-txt">Click to play a round</span>
        </li>

        <!-- Turbo -->
        <li class="how-row">
            <span class="ico ico-round-dark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor"/>
            </svg>
            </span>
            <span class="how-txt">Click to activate the turbo mode for faster animations</span>
        </li>

        <!-- Increase -->
        <li class="how-row">
            <span class="ico ico-square" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M7 15l5-5 5 5" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            </span>
            <span class="how-txt">Click to increase play amount</span>
        </li>

        <!-- Decrease -->
        <li class="how-row">
            <span class="ico ico-square" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M7 9l5 5 5-5" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            </span>
            <span class="how-txt">Click to decrease play amount</span>
        </li>
        </ul>

        <h3>General Disclaimer</h3>
        <p class="disclaimer">{disclaimer}</p>

      </div>
    </section>
  </div>
{/if}

<style>
  .backdrop{
    position:fixed; inset:0; z-index:200;
    background: rgba(0,0,0,.55);
    display:flex; align-items:center; justify-content:center;
    padding: 24px;
  }
  .modal{
    width: clamp(320px, 78vw, 880px);
    max-height: 80vh;
    background: rgba(12,12,16,.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 16px;
    outline: 1px solid rgba(255,255,255,.06);
    box-shadow: 0 18px 50px rgba(0,0,0,.55);
    color: #eaeaf0;
    display:flex; flex-direction:column;
  }
  .head{ position:relative; padding: 18px 56px 6px; text-align:center; }
  .head h2{ margin:0; color: var(--blue); letter-spacing: .12em; font-weight: 900; }
  .close{
    position:absolute; top: 12px; right: 12px;
    width: 36px; height: 36px; border-radius: 999px;
    border: 0; background: transparent; color: #ddd;
    font-size: 20px; cursor: pointer;
  }
  .close:hover{ color:#fff; }

  .body{ padding: 10px 26px 22px; overflow:auto; }
  .body h3{ margin:16px 0 8px; color: var(--blue); letter-spacing: .06em; font-size: var(--body-fs, 20px);}
  .body p{ margin:0 0 10px; color:#e7e7ee; font-weight: 600; font-size: var(--body-fs, 10px);}

  .mode{ margin: 16px 0 12px; font-size: var(--mode-fs, 10px);}
  .mode-title{ font-weight: 800; margin-bottom: 8px; }

  .place-row{
    display:grid;
    grid-template-columns: 48px 1fr;
    align-items: start;
    gap: 8px 12px;
    margin: 6px 0;
  }
  .place-label{
    font-weight: 800;
    color: #cfd2da;
    letter-spacing: .02em;
    text-align: right;
  }

  .legend{
    display:grid; grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 10px 18px; list-style:none; margin:0; padding:0;
  }
  .legend li{ display:flex; align-items:center; gap:10px; }
  .dot{
    width:14px; height:14px; border-radius:999px; display:inline-block;
    background: var(--c, #999);
    box-shadow: 0 0 0 2px rgba(255,255,255,.15) inset;
  }
  .emoji{
    font-size: 1.05rem; width: 1.25em; display: inline-flex;
    justify-content: center; align-items: center; line-height: 1;
  }
  .txt{ font-weight:800; color:#fff; }

  /* HOW TO PLAY */
  .how{
    list-style:none; margin:6px 0 14px; padding:0;
    display:flex; flex-direction:column; gap:10px;
    font-size: var(--how-fs, 10px);
  }
  .how-row{ display:flex; align-items:center; gap:12px; }
  .how-txt{ color:#eaeaf0; font-weight:700; }

  /* Shared 32px icon column (the regular small icons) */
  .ico{
    --ico: 32px;
    width: var(--ico);
    height: var(--ico);
    flex: 0 0 var(--ico);
    display:grid; place-items:center;
    box-sizing: border-box;
  }
  .ico svg{
    width: calc(var(--ico) * 0.62);
    height: calc(var(--ico) * 0.62);
    display:block;
    color: currentColor;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ico-round-dark{
    border-radius: 999px;
    background: #0f1014;
    color: #fff;
    border: 2px solid #fff;
  }
  .ico-round-white{
    border-radius: 999px;
    background: #fff;
    color: #111;
    border: 3px solid #111;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
  }
  .ico-square{
    border-radius: 8px;
    background: rgba(255,255,255,.10);
    color:#fff;
    border: 0;
  }

  /* Difficulty demo buttons (aligned to the same 32px column) */
  .round.demo{
    --size: 32px;                    /* outer button size equals .ico column */
    width: var(--size);
    height: var(--size);
    flex: 0 0 var(--size);
    border-radius: 999px;
    border: 2px solid #fff;          /* white ring to match other icons */
    background: #0f1014;
    color: #fff;
    display:grid; place-items:center;
    box-shadow: none;                /* other icons have no shadow */
    margin: 0;
  }

  /* Inner icon layouts (same proportions as your real picker) */
  .icon.one .star{   width:calc(var(--size)*0.42); height:calc(var(--size)*0.42); }
  .icon.two{
    display:grid; grid-auto-flow:column; align-items:center;
    gap:calc(var(--size)*0.10);
  }
  .icon.two .star{   width:calc(var(--size)*0.30); height:calc(var(--size)*0.30); }
  .icon.three{
    display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto auto;
    align-items:center; column-gap:calc(var(--size)*0.08); row-gap:calc(var(--size)*0.02);
  }
  .icon.three .star{ width:calc(var(--size)*0.28); height:calc(var(--size)*0.28); }
  .icon.three .bottom{ grid-column:1 / span 2; justify-self:center; }
  .icon.skull .skull{ width:calc(var(--size)*0.44); height:calc(var(--size)*0.44); display:block; }

  .rtp{ font-weight:700; white-space: pre-line; }
  .disclaimer{ font-size:.9rem; line-height:1.4; color: #fff;}
</style>
