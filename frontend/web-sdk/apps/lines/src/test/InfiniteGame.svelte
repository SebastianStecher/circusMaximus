<script lang="ts">
  import BetAmountDisplay from './BetAmountDisplay.svelte';
  import DifficultyPicker from './DifficultyPicker.svelte';
  import type { Difficulty } from '../math/types';
  import PlayButton from './PlayButton.svelte';
  import BalanceDisplay from './BalanceDisplay.svelte';
  import { play as spin, getTable } from '../math/infinite';
  import RecentMultipliers from './RecentMultipliers.svelte';
  import { onMount, onDestroy, tick } from 'svelte';
  //import { rgs } from './rgs';
	import SpeedButton from './SpeedButton.svelte';
  import AutoplayButton from './AutoplayButton.svelte';
	import UIBarShell from './UIBarShell.svelte';
	import GameScaler from './GameScaler.svelte';
	import SideMenu from './SideMenu.svelte';
  import InfoModal from './InfoModal.svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import CatmullRomTrack, { type Waypoint, type PT } from './CatmullRomTrack.svelte';
	import LaneRunner from './LaneRunner.svelte';
  import { RaceDirector } from './RaceDirector';
	import { randomInteger } from 'utils-shared/random';
	import DisplayBoard from './DisplayBoard.svelte';
	import { buildLinesByDifficulty, getPlace, getRandomMultiplier } from './placements';
	import MultiplierSign from './MultiplierSign.svelte';
  import ConfettiCannons from './Confetti.svelte';
	import Firework from './Firework.svelte';


  let confetti: InstanceType<typeof ConfettiCannons>;
  let fw: InstanceType<typeof Firework>;


  function boundsOf(points: Waypoint[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  function rotatePoints(points: Waypoint[], deg: number): Waypoint[] {
    const rad = (deg * Math.PI) / 180;
    const { minX, minY, maxX, maxY } = boundsOf(points);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return points.map(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos
      };
    });
  }
  const LINES = buildLinesByDifficulty({ decimals: 'auto', sep: ' | ', suffix: 'x' });

  let multiplier = $state();
  let place = $state();
  
  // Wide Flow Track – clockwise
  let points: Waypoint[] = [
    // —— obere lange Gerade (links → rechts), y ~ 42
    { x: -12, y: 42 },
    { x:  25, y: 42 },
    { x:  65, y: 42 },
    { x: 105, y: 42 },
    { x: 138, y: 42 },

    // —— rechte enge Kurve (oben → unten)
    { x: 150, y: 46 },
    { x: 158, y: 67 },
    { x: 150, y: 88 },

    // —— untere lange Gerade (rechts → links), y ~ 92
    { x: 120, y: 92 },
    { x:  80, y: 92 },
    { x:  40, y: 92 },
    { x:   0, y: 92 },
    { x: -16, y: 92 },

    // —— linke enge Kurve (unten → oben)
    { x: -26, y: 88 },
    { x: -32, y: 67 },
    { x: -26, y: 46 },
  ];


  const displayPoints = $derived.by(() =>
    isMobile ? rotatePoints(points, -90) : points
  );

  let lanes: PT[][] = $state([]);
  let speeds;
  let totalLength = 0;
  let SPEED_BASE = 75
  let FAST_PLAY_SPEED = 225;
  let base = $state(SPEED_BASE);

  let runnerRef = $state();

  async function onReady(e: CustomEvent) {
    lanes = e.detail.lanes;
    totalLength = e.detail.totalLength ?? e.detail.length ?? 0;

    if (!lanes?.length || !totalLength) {
      console.warn('[Track] Missing lanes or totalLength:', { lanesLen: lanes?.length, totalLength });
      return;
    }

    // ensure <LaneRunner bind:this={runnerRef}> is mounted
    await tick();
  }

  function goRace(m: Number) {
    runnerRef?.reset(true);
    let p = getPlace(difficulty,m);
    director?.reset?.();          // s.u. (kleine Ergänzung in RaceDirector)
    director?.setOutcome(p);
    director?.prime?.();          // s.u. (setzt Initialspeeds)
    director?.start();
    runnerRef?.start();       // jetzt geht’s los
  }

  let director: RaceDirector | null = null;

  function setupDirector() {
    if (!lanes?.length || !totalLength) {
      console.warn('[Track] Missing lanes or totalLength:', { lanesLen: lanes?.length, totalLength });
      return;
    }

    try {
      director?.stop();
      director = new RaceDirector({
        lanes,
        totalLength,
        baseSpeed: base,
        playerIndex: 0,
        seed: randomInteger({min:1, max:10000}).toString(),
        beatsCount: 5,
        drama: {
          gapScale: 0.25,//randomInteger({min:11, max:18})/10,          // größere End-Gaps
          spreadEarly: [randomInteger({min:1, max:3})/10, randomInteger({min:3, max:5})/10],// Early kann sehr eng bis moderat sein
          spreadMid:   [randomInteger({min:5, max:9})/10, randomInteger({min:9, max:17})/10], // Mid mal enger, mal breiter
          swapsMin: randomInteger({min:0, max:3})/10,             // min Lead-Swaps
          swapsMax: randomInteger({min:3, max:9})/10,             // max Lead-Swaps
          comebackChance: 0.3,    // öfter „last-to-first“
        }
      });


      director.attach(
        (arr) => runnerRef?.setSpeeds?.(arr),
        () =>   runnerRef?.getProgress?.() ?? [0,0,0,0]
      );

      // make sure equalization uses the player's lane (outer lane fix)
      director.recomputeEqualization();

      runnerRef?.reset?.(true);
      director.reset();
      director.prime();       // push initial v to LaneRunner immediately
    } catch (err) {
      console.error('[Director] setup failed:', err);
    }
  }


  // ---- Audio ----
  let winAudio: HTMLAudioElement | null = null;
  let carAudio: HTMLAudioElement | null = null;

  const CAR_SRC = 'sounds/raceCar.mp3';   // <— Pfad anpassen
  const CAR_POOL_SIZE = 8;             // bei Bedarf erhöhen

  const carPool: HTMLAudioElement[] = [];
  for (let i = 0; i < CAR_POOL_SIZE; i++) {
    const a = new Audio(CAR_SRC);
    a.preload = 'auto';
    a.crossOrigin = 'anonymous';
    // a.setAttribute('playsinline', ''); // iOS
    carPool.push(a);
  }
  let carIdx = 0;

  async function carSound(ms: number) {
    // Delay wie gehabt
    if (ms > 0) await new Promise(r => setTimeout(r, ms));

    // Nächste freie/folgende Instanz aus dem Pool nehmen (Round-Robin)
    const a = carPool[carIdx];
    carIdx = (carIdx + 1) % carPool.length;

    // diese Instanz frisch starten (ohne die anderen zu stoppen!)
    try { a.pause(); } catch {}
    try { a.currentTime = 0; } catch {}

    a.loop = false;
    a.volume = volume;

    try {
      await a.play();
    } catch (e) {
      console.warn('carSound play blocked:', e);
    }
  }


  async function winSound() {
    if (!winAudio) return;
    winAudio.loop = false;
    winAudio.volume = volume;
    winAudio.pause();
    try { winAudio.currentTime = 0; } catch {}
    try { await winAudio.play(); } catch (e) { console.warn('winSound play blocked:', e); }
  }

  // ---- Types & State ----
  type BalanceRaw = Record<string, unknown>;
  type UIBalance = { amount: number; currency: string }; // Major Units fürs UI

  let balancePretty = $state<UIBalance>({ amount: 0, currency: 'EUR' });
  let unsub: () => void;

  const ANIMATION_TIME = 2500;
  let canPlay = $state(true);

  let musicVol = $state(0.5);
  let musicMuted = $state(false);
  let showInfo = $state(false);

  let volume = $derived(musicMuted ? 0 : musicVol);

  // WICHTIG: amount bleibt in MINOR Units (z.B. 1_000_000 == 1.00)
  let amount = $state<number>(1_000_000);
  let balance = $state<number>(0);        // Major Units
  let difficulty: Difficulty = $state('Easy');
  let lastPayout = $state(0);

  let autoCount = $state(0);

  let pulseKey = $state(0);

  let history: number[] = $state([]);

  let betLevels: number[] = $state([]);

  // --- Loading-Gate State ---
  let isReady = $state(false);
  let loadPct = $state(0);
  let loadError: string | null = $state(null);

  let authOk = $state(false);

  let isMobile = $state(false);

  function computeIsMobile(): boolean {
    if (typeof window === 'undefined') return false;

    // 0) Viewport-Messung (bevorzugt visualViewport)
    const vw = (window.visualViewport?.width ?? window.innerWidth) || window.screen.width;
    const vh = (window.visualViewport?.height ?? window.innerHeight) || window.screen.height;
    const isPortrait = vw < vh; // Popout/hochkant → Mobile-Layout

    // 1) Modern: UA Client Hints
    // @ts-expect-error: userAgentData ist nicht überall getypt
    const uach = navigator.userAgentData;
    if (uach && typeof uach.mobile === 'boolean' && uach.mobile) {
      return true;
    }

    // 2) Eingabe-/Hover-Fähigkeiten
    const coarsePtr =
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches;
    const noHover =
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-hover: none)').matches;

    // 4) Popout/Portrait erzwingt Mobile-Ansicht
    return (coarsePtr && noHover) || (isPortrait && vw <= 1000);
  }

  const API_MULTIPLIER = 1_000_000; // dein Fallback
  let currentCurrency = $state('EUR');

  function toMajor(minor: number) { return minor / API_MULTIPLIER; }

  // Verschiedene Backend-Shapes robust normalisieren + minorMul aktualisieren
  function normalizeBalance(raw?: BalanceRaw): UIBalance | null {
    if (!raw || typeof raw !== 'object') return null;
    const currency = (raw['currency'] as string | undefined) ?? 'EUR';
    currentCurrency = currency;

    const candidates = [
      raw['amountMinor'], raw['minor'], raw['availableMinor'],
      raw['amount'],      raw['available'], raw['balanceMinor']
    ];
    let minor: number | undefined;
    for (const c of candidates) {
      if (typeof c === 'number' && Number.isFinite(c)) { minor = c; break; }
      if (typeof c === 'string' && c.trim() !== '' && !Number.isNaN(Number(c))) { minor = Number(c); break; }
    }

    if (minor === undefined) {
      const majors = [raw['balance'], raw['value'], raw['major']];
      for (const m of majors) {
        if (typeof m === 'number' && Number.isFinite(m)) { return { amount: m, currency }; }
        if (typeof m === 'string' && m.trim() !== '' && !Number.isNaN(Number(m))) { return { amount: Number(m), currency }; }
      }
      return null;
    }
    return { amount: minor / API_MULTIPLIER, currency };
  }

  async function winAnimation(){
    fw.volley(randomInteger({min:3, max:5}), 100);
    await new Promise((r) => setTimeout(r, 500));
    confetti.fire('both', { count: 120, power: 680 });
    winSound();
  }

  async function doPlay() {
    let m = getRandomMultiplier(difficulty);
    setupDirector();
    goRace(m);
    console.log("Place: " + getPlace(difficulty, m));

    const betMinor = amount;            // MINOR
    const betMajor = toMajor(betMinor); // fürs UI

    if (balance < betMajor || !canPlay) return;

    canPlay = false;

    balance -= betMajor;

    // Immer sichere Zahlen benutzen
    const num = (v: any, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    try {
      // --- /wallet/play ---
      const res = await rgs.Play({ amount: betMinor, mode: difficulty.toLowerCase() });

      if (res?.balance) updateBalance(res.balance);

      const round = res?.round ?? {};
      const isActive = !!round.active;

      // Wenn Server nichts liefert (typisch bei DNF/0x & already closed), fallback auf 0
      let payoutMinor = num(round.payout, 0);
      let multiplierP = num(round.payoutMultiplier, isActive ? 0 : 0);

      // --- Rennen + UI nur mit validen Zahlen starten ---
      place = null;
      setupDirector();
      goRace(multiplierP);
      carSound(250);
      carSound(300);
      carSound(500);
      if(base == SPEED_BASE){
        carSound(700);
        carSound(800);
        carSound(1300);
      }

      // Rennende abwarten
      await director?.waitForFinish?.();

      if (multiplierP >= 1) {
        winAnimation();
        pulseKey++;
      }

      place = getPlace(difficulty, multiplierP);
      multiplier = multiplierP;

      // UI-Balance nach dem Rennen anpassen
      balance += toMajor(payoutMinor);
      lastPayout = payoutMinor;

      // Verlauf sicher aktualisieren (keine undefined)
      history = [...history, multiplierP];

      // EndRound NUR wenn Runde serverseitig noch aktiv ist
      if (isActive) {
        try {
          const endRes = await rgs.EndRound();
          if (endRes?.balance) updateBalance(endRes.balance);
        } catch (err) {
          console.warn('[RGS] EndRound failed (non-fatal):', err);
        }
      }

    } catch (err) {
      console.error('[RGS] Play failed:', err);
      // Rollback bei Fehler
      balance += betMajor;
      try {
        const endRes = await rgs.EndRound();
        if (endRes?.balance) updateBalance(endRes.balance);
      } catch (err2) {
        console.warn('[RGS] EndRound failed (non-fatal):', err2);
      }
    } finally {
      canPlay = true;
    }
  }


  async function handleStart(){
    while(autoCount > 0){
      if(balance * API_MULTIPLIER < amount){
        autoCount = 0;
        continue;
      }
      await doPlay();
      if (autoCount > 0) {
        await new Promise((r) => setTimeout(r, 750));
      }
      autoCount -=1;
    }
  }

  function updateBalance(raw: BalanceRaw) {
    const ui = normalizeBalance(raw);
    if (!ui) {
      console.warn('[RGS] Unknown balance shape:', raw);
      return;
    }
    balance = ui.amount;       // Major Units
    balancePretty = { ...ui }; // Anzeige
  }

  const IMAGES = [
    'models/display1.png',
    'models/you.png',
    'models/carWhite.png',
    'models/carPNG.png',
    'models/carYellow.png',
    'models/carRed.png'
  ];

  function preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // img.crossOrigin = 'anonymous'; // nur nötig, wenn du von fremder Domain lädst
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Image failed: ${url}`));
      img.src = url;
    });
  }

  // ---- Deine kombinierte Preload-Funktion ----
  async function preloadAssets(opts: { images?: string[]}) {
    THREE.Cache.enabled = true;

    const images = opts.images ?? [];

    const total = images.length;
    if (total === 0) return;

    let loaded = 0;
    const bump = () => { loaded++; loadPct = Math.round((loaded / total) * 100); };

    // 1) Bilder (PNG/JPG/etc.) – DOM-Image Preload
    const imageTasks = images.map((url) =>
      preloadImage(url).then(bump)
    );

    // Alles parallel laden
    await Promise.all([...imageTasks]);
  }


  onMount(async () => {
    // 1) AUTHENTICATE — bei Fehler: hart abbrechen und Fehler anzeigen
    /*try {
      const res = await rgs.Authenticate();
      if (res?.balance) updateBalance(res.balance);
      if (res?.config?.betLevels)      betLevels = res.config.betLevels;
      if (res?.config?.defaultBetLevel) amount   = res.config.defaultBetLevel;
      authOk = true;
    } catch (err:any) {
      console.error('[RGS] Authenticate failed:', err);
      loadError = 'Authentication failed' + (err?.message ? `: ${err.message}` : '');
      // NICHT isReady setzen; Spiel darf NICHT rendern
      return;
    }*/

    // 2) ASSETS PRELOADEN — bei Fehler: ebenfalls im Loader bleiben
    try {
      await preloadAssets({ images: IMAGES});
      isReady = true; // nur wenn Auth + Preload OK
    } catch (e:any) {
      loadError = e?.message ?? 'Unbekannter Ladefehler';
      return;
    }

    // 3) Restliche Initialisierung NACH erfolgreich Auth + Preload
    let initialized = false;

    // Guard gegen Reload-Loops (z. B. bei Resize-Jitter):
    let reloadTimer: number | null = null;

    // Session-Guard: merkt sich den letzten Modus ("m"/"d") über einen Reload hinweg
    const modeKey = 'rf_mode';
    const writeMode = (m: boolean) => sessionStorage.setItem(modeKey, m ? 'm' : 'd');
    const readMode  = () => sessionStorage.getItem(modeKey);

    const update = () => {
      const next = computeIsMobile();
      const changed = isMobile !== next;

      isMobile = next;

      if (!initialized) {
        // Initialen Modus merken und fertig.
        if (!readMode()) writeMode(next);
        initialized = true;
        return;
      }

      if (changed) {
        // Nur reloaden, wenn sich der persistent gespeicherte Modus wirklich ändert:
        const last = readMode();
        const now  = next ? 'm' : 'd';
        if (last !== now) {
          writeMode(next);
          // debounce, um mehrfach-Events (orientation+resize) zusammenzufassen
          if (reloadTimer) clearTimeout(reloadTimer);
          reloadTimer = window.setTimeout(() => {
            window.location.reload();
          }, 150);
        }
      }
    };

    // Initial bestimmen + Listener setzen
    update();

    const mqs = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(any-pointer: coarse)'),
      window.matchMedia('(hover: none)'),
      window.matchMedia('(any-hover: none)'),
      window.matchMedia('(orientation: portrait)'),
      window.matchMedia('(max-width: 1000px)') // dein Breakpoint
    ];

    mqs.forEach(mq => mq.addEventListener('change', update));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const onBalance = (ev: Event) => updateBalance((ev as CustomEvent).detail);
    window.addEventListener('balanceUpdate', onBalance);

    unsub = () => {
      window.removeEventListener('balanceUpdate', onBalance);
      mqs.forEach(mq => mq.removeEventListener('change', update));
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  });

  onDestroy(() => {
    unsub?.();
  });
</script>

<svelte:window
  on:keydown={(e) => {
    if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
      e.preventDefault();   // verhindert Scrollen
      if(autoCount === 0) doPlay();
      else autoCount = 0;
      //console.log("Leertaste");
    }
  }}
/>

<audio bind:this={winAudio} preload="auto" style="display:none">
  <source src="sounds/firework.mp3" type="audio/wav" />
</audio>

<audio bind:this={carAudio} preload="auto" style="display:none">
  <source src="sounds/raceCar.mp3" type="audio/wav" />
</audio>

{#if isReady}
    {#if isMobile}
      <InfoModal bind:open={showInfo} on:close={() => (showInfo = false)} fontSize={12}/>
    {/if}

  <GameScaler width={1200} height={isMobile ? 2300: 675} padding={0}>
    <div class="game-bg"></div>
    <div class="stage">

      <ConfettiCannons bind:this={confetti} zIndex={5000}
        colors={['#ffd400','#ff4d4d','#4dd2ff','#7dff7a','#ffffff']} />

      <Firework bind:this={fw} zIndex={6000}
        colors={['#ffd400','#ff4d4d','#4dd2ff','#7dff7a','#ffffff']} />
      <!--
      <div class="hud-layer" style={`left:${isMobile ? '790px' : '1050px'}; top:${isMobile ? '1200px' : '50px'}`}>
        <MultiplierSign
          useDom={true}          
          domHeight={isMobile ? 225 : 120}
          domAnchor="tr"
          domX={24}
          domY={24}
          domClass="race-sign"
          place={place}
          multiplier={multiplier}
        />
      </div>
      -->

    <div
      class="track-wrap"
      style={`--track-top:${isMobile ? 8 : 0}%; --track-height:${isMobile ? 84 : 92}%;`}
    >
      <div class="track-box">
        <CatmullRomTrack
          waypoints={displayPoints}
          on:ready={onReady}
          closed={true}
          alpha={0.5}
          segmentStep={0.02}
          spacing={0.5}
          laneOffsets={[-8.4, -2.8, 2.8, 8.4]}
          debug={false}
        />
        {#if lanes.length > 0}
          <LaneRunner
            {lanes}
            bind:this={runnerRef}
            speeds={speeds}
            carImgs={["models/roman.png","models/roman.png","models/roman.png","models/roman.png"]}
            imgWidth={18}
            imgHeight={9}
            rotateWithHeading={true}
            loop={false}
            debug={false}
            headingOffsets={[90, 90, 90, 90]}
            curbDash = {5}
          />
        {/if}
      </div>
    </div>
    <!--
    <DisplayBoard
      src={"models/display1.png"}
      width= {isMobile ? "400px" :"300px"}
      height={isMobile ? "300px":"200px"}
      padding="30px"
      rounded="16px"
      objectFit="cover"
      align="left"
      vAlign="middle"
      position="absolute"
      top= {isMobile ? "450px" : "205px"}
      left={isMobile ? "50px" : "250px"}
      fontSize={isMobile ? "30px":"18px"}
      zIndex={10}
      difficulty={difficulty}
      linesByDifficulty={LINES}
    />

    <DisplayBoard
      src={"models/you.png"}
      width={isMobile ? "150px":"100px"}
      height={isMobile ? "200px" : "150px"}
      padding="30px"
      objectFit="cover"
      align="left"
      vAlign="middle"
      position="absolute"
      top={isMobile ? "700px" : "20px"}
      left="560px"
      zIndex={10}
    />
  -->
    {#if !isMobile}
      <InfoModal bind:open={showInfo} on:close={() => (showInfo = false)} fontSize={20}/>
    {/if}

      <div class="recent-wrap">
        <RecentMultipliers
          multipliers={history}
          visibleCount={isMobile ? 5 : 10}
          itemWidth={isMobile ? 160 : 80}
          itemHeight={isMobile ? 88 : 35}
          gap={10}
          decimals={2}
          fontSize={isMobile ? 32: 18}
        />
      </div>
      {#if !isMobile}
        <UIBarShell placement="bottom" maxWidth={900} height={55} margin={12} alpha={0.78} blur={1} radius={14}>
          <div class="ui-row">
            <SideMenu
              on:info={() => showInfo = true}
              on:musicchange={(e) => musicVol = e.detail}
              on:musicmutechange={(e) => musicMuted = e.detail}
            />


            <BalanceDisplay balance={balancePretty} />
            <div class="spacer" />

            <BetAmountDisplay bind:amount {autoCount} {betLevels} currency={currentCurrency} {canPlay}/>

            <PlayButton on:click={doPlay} bind:autoCount spinning={!canPlay} size={100} />

            <div class="side-stack">
              <AutoplayButton bind:selected={autoCount} onStart={handleStart} size={44} />
              <SpeedButton bind:base factor={FAST_PLAY_SPEED} normal={SPEED_BASE} size={44} />
            </div>
            <DifficultyPicker bind:difficulty {autoCount} size={56} {canPlay}/>
          </div>
        </UIBarShell>
      {:else}
        <UIBarShell placement="bottom" maxWidth={1300} height={110} margin={35} alpha={0.78} blur={1} radius={14}>
          <div class="ui-row">
            <SideMenu
              on:info={() => showInfo = true}
              on:musicchange={(e) => musicVol = e.detail}
              on:musicmutechange={(e) => musicMuted = e.detail}
              size={56}
              panelWidth={320}
              panelScale={1.15}
              panelFontSize={25}
            />


            <BalanceDisplay balance={balancePretty} labelFontSize={30} amountFontSize={35}/>
            <div class="spacer" />


            <PlayButton on:click={doPlay} bind:autoCount spinning={!canPlay} size={175} />

            <div class="side-stack">
              <AutoplayButton bind:selected={autoCount} onStart={handleStart} size={80} />
              <SpeedButton bind:base factor={FAST_PLAY_SPEED} normal={SPEED_BASE} size={80} />
            </div>
            <DifficultyPicker bind:difficulty {autoCount} size={80} {canPlay}/>
          </div>
        </UIBarShell>
        <div style="position:absolute; right:35%; top:76%; transform:translateY(-50%); z-index:10;">
          <BetAmountDisplay bind:amount {autoCount} {betLevels} currency={currentCurrency} chevronHeight={65} chevronWidth={55} labelFontSize={30} valueFontSize={45} {canPlay}/>
        </div>

      {/if}

      <div class="bottom-bar">
        <div class="right"><DifficultyPicker bind:difficulty/></div>
      </div>
    </div>
  </GameScaler>
{:else}
  <div class="loader-wrap">
    <div class="loader-card">
      <img class="loader-logo" src="models/RaceFast-FG.png" alt="Race Fast" />
      <div class="loader-title">Loading…</div>
      <div class="loader-bar">
        <div class="loader-fill" style={`width:${loadPct}%;`}></div>
      </div>
      {#if loadError}
        <div class="loader-error">Error: {loadError}</div>
        <button class="btn-retry" on:click={() => window.location.reload()}>
          Retry
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>

  .loader-logo{
  display:block;
  width: 300px;               /* bei Bedarf anpassen */
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));
  animation: loaderFloat 2.4s ease-in-out infinite;
}
  .hud-layer { position: relative; left:1050px; top: 50px; z-index: 0;}
  .game-root {
      position: relative;
      overflow: hidden;
    }
    .game-bg {
      position: absolute;
      inset: 0;
      background: #3f423e; /* dein Grün */
      z-index: 0;
      pointer-events: none;
    }

  /* Track-Fenster: begrenzt die vertikale Fläche für Track & Runner */
  .track-wrap{
    position: absolute;
    left: 0; right: 0;
    /* oben etwas Luft lassen und Höhe begrenzen */
    top: var(--track-top, 10%);
    height: var(--track-height, 80%);
    z-index: 2;         /* über dem Hintergrund, unter UI-Bar */
    pointer-events: none; /* falls UI drüberliegen soll; bei Bedarf entfernen */
  }

  /* Container für die beiden Komponenten */
  .track-box{
    position: relative;
    width: 100%;
    height: 100%;
    pointer-events: auto; /* LaneRunner darf weiterhin Events bekommen */
  }

  /* Falls die Kinder intern 100% nehmen, passt es sich sauber an */
  .track-box :global(canvas),
  .track-box :global(svg){
    width: 100%;
    height: 100%;
    display: block;
  }

  .btn-retry{
    margin-top:12px; padding:8px 12px; border:0; border-radius:10px;
    background:#27c0ff; color:#0b0d12; font-weight:600; cursor:pointer;
  }
  .btn-retry:hover{ filter:brightness(1.1); }
  .stage { position: relative; width: 100%; height: 100%; z-index: 1;}
  .notepad-wrap { position: absolute; top: 35%; transform: translateY(-50%); z-index: 4; pointer-events: none; }
  .recent-wrap { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 4; }
  .toast-layer { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
  .bottom-bar {
    position: absolute; left: 0; right: 0; bottom: 24px;
    display: grid; grid-template-columns: auto auto auto auto auto;
    align-items: center; column-gap: 20px; z-index: 3;
  }
  .left   { justify-self: end; }
  .center { justify-self: center; }
  .right  { justify-self: start; }
  .ui-row {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 52px;
  }

  .spacer { flex: 1; }

  .hamburger {
    width: 36px; height: 32px; padding: 0; border: 0; background: transparent; cursor: pointer;
    display: inline-flex; flex-direction: column; justify-content: center; gap: 4px;
  }
  .hamburger span {
    display: block; width: 22px; height: 2px; background: #fff; opacity: .9; border-radius: 2px;
  }

  .side-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px; /* space between the two round buttons */
  }

    /* remove the old bottom bar grid */
    .bottom-bar { display: none; }
    .loader-wrap {
    position: absolute; inset: 0; display: grid; place-items: center;
    background: rgba(5,6,10,0.85); backdrop-filter: blur(3px); z-index: 999;
  }
  .loader-card {
    min-width: 220px; max-width: 280px; padding: 20px 22px;
    border-radius: 14px; background: rgba(20,22,28,0.9);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    color: #27c0ff; text-align: center;
  }
  .loader-title { font-weight: 600; margin: 8px 0 12px; opacity: .95; }
  .loader-bar {
    height: 8px; border-radius: 999px; background: rgba(255,255,255,0.15);
    overflow: hidden; margin: 6px 0 2px;
  }
  .loader-fill { height: 100%; background: #27c0ff; transition: width .2s ease; }
  .loader-pct { font-size: 12px; opacity: .8; }
  .loader-error { margin-top: 10px; font-size: 16px; color: #ff8080; }
  .spinner {
    margin: 0 auto 8px; width: 32px; height: 32px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.2); border-top-color: #27c0ff;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  :global(body) { -ms-touch-action: manipulation; touch-action: manipulation; }
</style>
