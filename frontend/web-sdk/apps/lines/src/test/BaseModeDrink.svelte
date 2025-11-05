<script lang="ts">
    import BetAmountDisplay from './BetAmountDisplay.svelte';
    import PayoutDisplay from './PayoutDisplay.svelte';
    import RoundCounter from './RoundCounter.svelte';
    import DifficultyPicker from './DifficultyPicker.svelte';
    import { quote, play } from '../math/demo';
    import type { Difficulty } from '../math/types';
    import PlayButton from './PlayButton.svelte';
	  import BalanceDisplay from './BalanceDisplay.svelte';
	  import RestartButton from './RestartButton.svelte';
	  import ThreeBar from '../three/ThreeBar.svelte';
	  import WinToast from './WinToast.svelte';
	import Bar2 from '../three/Bar2.svelte';

    type Vec3 = [number, number, number];

    // 10 frei gesetzte Koordinaten (Beispielwerte!)
    let glassPositions: Vec3[] = [
      // Reihe 1
      [-5.5, 2.795, 5.0],
      [-5, 2.795, 5.0],
      [-4.5, 2.795, 5.0],
      [-4, 2.795, 5.0],
      //Reihe 2
      [-5.25, 3.64, 5.0],
      [-4.75, 3.64, 5],
      [-4.25, 3.64, 5],
      //Reihe 3
      [-5, 4.485, 5],
      [-4.5, 4.485, 5],
      //Reihe 4
      [-4.75, 5.33, 5],
    ];

    let bgAudio: HTMLAudioElement | null = null;
    let winAudio: HTMLAudioElement | null = null;
    let loseAudio: HTMLAudioElement | null = null;

    async function ensureMusic() {
      if (!bgAudio) return;
      bgAudio.loop = true;
      bgAudio.volume = 0.15;
      if (bgAudio.paused) {
        try {
          await bgAudio.play();   // wird beim ersten User-Klick erlaubt
        } catch (err) {
          console.warn('Audio play blocked:', err);
        }
      }
    }

    async function winSound() {
      if (!winAudio) return;
      winAudio.loop = false;
      winAudio.volume = 0.25;
      
      await winAudio.play();
    }

    async function loseSound() {
      if (!loseAudio) return;
      loseAudio.loop = false;
      loseAudio.volume = 0.25;
      
      await loseAudio.play();
    }

    const TOTAL_SHOTS = 10;
    const ANIMATION_TIME = 2500;

    let balance = $state(100_000_000);
    let amount = $state(1_000_000);
    let difficulty: Difficulty = $state('Easy');
    let streak = $state(0);
    let lastPayout = $state(0);

    let glassesVisible = $state(Array.from({ length: TOTAL_SHOTS }, () => false));

    // Win-Toast State
    let toastAmount = $state(0);
    let toastKey = $state(0); // bei jedem Gewinn ++ => remount

    let flashKey = $state(0);
    let animKey = $state(0);
    let hitKey = $state(0);

    let next = $derived(quote({ amount, difficulty, streak }));

    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function doPlay() {
    await ensureMusic();
    if (balance >= amount) {
      balance -= amount;

      const res = await play({ amount, difficulty, streak });

      balance += res.payout;
      lastPayout = res.payout;

      if (res.win) {
        winSound();

        // 0-basierter Index aus neuem Streak ableiten (und begrenzen)
        const idx = Math.max(0, Math.min(res.newStreak - 1, TOTAL_SHOTS - 1));

        // Win-UI/FX
        toastAmount = res.payout;
        toastKey += 1;
        flashKey += 1;
        animKey += 1;

        // Glas sichtbar schalten
        if (idx < glassesVisible.length) {
          const copy = [...glassesVisible];
          copy[idx] = true;
          glassesVisible = copy;
        }
        } else {
          loseSound();
          glassesVisible = Array.from({ length: TOTAL_SHOTS }, () => false);
          hitKey += 1;
        }

        // zuletzt den Streak übernehmen
        streak = res.newStreak; // bei Lose -> 0, bei Win -> +1
      }
    }


    function restart() {
       streak = 0; 
       glassesVisible = Array.from({ length: TOTAL_SHOTS }, () => false);
    }
</script>

<audio bind:this={bgAudio} preload="auto" style="display:none">
  <source src="/sounds/bg.mp3" type="audio/mpeg" />
  <source src="/sounds/bg.ogg" type="audio/ogg" />
  <source src="/sounds/bg.wav" type="audio/wav" />
</audio>

<audio bind:this={winAudio} preload="auto" style="display:none">
  <source src="/sounds/winSound_trim.mp3" type="audio/mpeg" />
  <source src="/sounds/winSound_trim.ogg" type="audio/ogg" />
  <source src="/sounds/winSound_trim.wav" type="audio/wav" />
</audio>

<audio bind:this={loseAudio} preload="auto" style="display:none">
  <source src="/sounds/loseSound.mp3" type="audio/mpeg" />
  <source src="/sounds/loseSound.ogg" type="audio/ogg" />
  <source src="/sounds/loseSound.wav" type="audio/wav" />
</audio>

<div class="stage">

  <ThreeBar {glassesVisible} {flashKey} {ANIMATION_TIME} {animKey} {hitKey} {glassPositions}/>


  <!-- WIN-Toast Overlay (höchste Ebene) -->
  <div class="toast-layer">
    {#key toastKey}
      {#if toastKey > 0}
        <WinToast amount={toastAmount} ms={ANIMATION_TIME} />
      {/if}
    {/key}
  </div>

  <div class="ui-top">
  <RoundCounter round={streak + 1}/>
  <PayoutDisplay potential={next.payout} last={lastPayout}/>
  </div>
  

  <div class="bottom-bar">
    <div class="left"><BetAmountDisplay bind:amount /></div>
    <div class="left"><BalanceDisplay balance={balance} /></div>
    <div class="center"><PlayButton on:click={doPlay} /></div>
    <div class="right"><RestartButton on:click={restart} /></div>
    <div class="right"><DifficultyPicker bind:difficulty streak={streak} /></div>
  </div>
</div>

<style>
  .stage {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .toast-layer {
    position: absolute;
    inset: 0;
    z-index: 6;          /* über allem */
    pointer-events: none;
  }

  .ui-top { position: relative; z-index: 2; }

  .bottom-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 24px;
    display: grid;
    grid-template-columns: auto auto auto auto auto;
    align-items: center;
    column-gap: 20px;
    z-index: 3; /* über dem ThreeCanvas */
  }

  .left   { justify-self: end; }
  .center { justify-self: center; }
  .right  { justify-self: start; }
</style>