<!-- DisplayBoard.svelte -->
<script lang="ts">
  // Optional: Difficulty-Typ importieren (Pfad ggf. anpassen/entfernen, falls du ohne Typ arbeiten willst)
  import type { Difficulty } from '../math/types';

  // Bildquelle (z. B. '/assets/display.png')
  export let src: string;
  export let alt: string = 'Display board';

  // Größe – Zahl (px) oder CSS-String ('60vh', '100%')
  export let width: number | string = 800;
  export let height: number | string = 450;

  // Positionierung – vom Parent steuerbar
  export let position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' = 'static';
  export let top: number | string | undefined = undefined;
  export let right: number | string | undefined = undefined;
  export let bottom: number | string | undefined = undefined;
  export let left: number | string | undefined = undefined;
  export let zIndex: number | string | undefined = undefined;
  // Feintuning via translate
  export let tx: number | string | undefined = undefined; // z. B. '50%' oder 12
  export let ty: number | string | undefined = undefined;

  // Darstellung
  export let rounded: number | string = 0;            // Border-Radius
  export let objectFit: 'cover' | 'contain' | 'fill' = 'cover';
  export let objectPosition: string = 'center';

  // Textinhalt & Layout (Fallback)
  export let lines: string[] = [];                    // mehrere Zeilen
  export let padding: number | string = 24;           // Innenabstand
  export let align: 'left' | 'center' | 'right' = 'center';
  export let vAlign: 'top' | 'middle' | 'bottom' = 'middle';
  export let gap: number | string = 8;                // Abstand zwischen Zeilen

  // Typografie (vom Parent steuerbar)
  export let color = '#ffffff';
  export let fontSize: number | string = 48;          // <-- Schriftgröße
  export let fontFamily = 'system-ui, Arial, sans-serif';
  export let fontWeight: number | string = 700;
  export let lineHeight = 1.15;
  export let letterSpacing: number | string = 0;
  export let textShadow = '0 2px 6px rgba(0,0,0,0.6)';

  // 🔹 Neu: Difficulty-gesteuerte Texte
  export let difficulty: Difficulty | null = null;
  export let linesByDifficulty: Record<Difficulty, string[]> | null = null;

  // Effektive Zeilen bestimmen (Difficulty → Map) oder Fallback auf lines
  $: effectiveLines =
    (difficulty && linesByDifficulty && linesByDifficulty[difficulty]) || lines;

  const toCss = (v: number | string | undefined) =>
    typeof v === 'number' ? `${v}px` : v ?? '';

  $: justifyContent =
    vAlign === 'top' ? 'flex-start' :
    vAlign === 'bottom' ? 'flex-end' : 'center';

  $: transformStr = (tx !== undefined || ty !== undefined)
    ? `transform: translate(${toCss(tx) || '0'}, ${toCss(ty) || '0'});`
    : '';

  $: posStyle = `
    position:${position};
    ${top    !== undefined ? `top:${toCss(top)};`       : ''}
    ${right  !== undefined ? `right:${toCss(right)};`   : ''}
    ${bottom !== undefined ? `bottom:${toCss(bottom)};` : ''}
    ${left   !== undefined ? `left:${toCss(left)};`     : ''}
    ${zIndex !== undefined ? `z-index:${zIndex};`       : ''}
    ${transformStr}
  `;
</script>

<div
  class="board"
  style="
    ${posStyle}
    --w: {toCss(width)};
    --h: {toCss(height)};
    --pad: {toCss(padding)};
    --gap: {toCss(gap)};
    --color: {color};
    --fs: {toCss(fontSize)};
    --lh: {lineHeight};
    --fw: {fontWeight};
    --ff: {fontFamily};
    --ls: {typeof letterSpacing === 'number' ? `${letterSpacing}px` : letterSpacing};
    --rounded: {toCss(rounded)};
    --justify: {justifyContent};
    --align: {align};
  "
>
  <img class="bg" {src} {alt} style="object-fit:{objectFit}; object-position:{objectPosition};" />
  <div class="overlay">
    {#if effectiveLines.length}
      {#key (difficulty ?? 'static') + '|' + effectiveLines.join('¦')}
        <div class="text">
          {#each effectiveLines as line}
            <div class="line" style="text-shadow:{textShadow};">{line}</div>
          {/each}
        </div>
      {/key}
    {:else}
      <!-- Optional: eigener Inhalt statt lines -->
      <div class="text"><slot /></div>
    {/if}
  </div>
</div>

<style>
  .board {
    position: relative;                 /* kann durch position-Prop überschrieben werden */
    width: var(--w);
    height: var(--h);
    border-radius: var(--rounded);
    overflow: hidden;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    border-radius: var(--rounded);
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: var(--justify);   /* vertikale Ausrichtung */
    align-items: center;
    pointer-events: none;               /* macht die Tafel “durchklickbar” */
  }
  .text {
    box-sizing: border-box;
    width: 100%;
    padding: var(--pad);
    text-align: var(--align);           /* horizontale Ausrichtung */
    display: flex;
    flex-direction: column;
    gap: var(--gap);
  }
  .line {
    color: var(--color);
    font-size: var(--fs);
    line-height: var(--lh);
    font-weight: var(--fw);
    font-family: var(--ff);
    letter-spacing: var(--ls);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
