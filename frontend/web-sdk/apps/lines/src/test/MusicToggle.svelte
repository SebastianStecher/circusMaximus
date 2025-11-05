<!-- svelte:options runes={false} -->
<script lang="ts">
  let el: HTMLAudioElement
  export let src = '/audio/bg.wav'
  export let volume = 0.35
  export let loop = true

  export async function start() {
    if (!el) return
    el.volume = volume
    el.loop = loop
    try { await el.play() } catch {}
  }
  export function setMuted(m:boolean) { if (el) el.muted = m }
</script>
<audio bind:this={el} {loop} preload="auto" {src} style="display:none" />
