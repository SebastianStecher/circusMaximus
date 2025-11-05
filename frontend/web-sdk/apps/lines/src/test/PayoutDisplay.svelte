<script lang="ts">
    export let potential = 0;
    export let last = 0;
</script>

<div class="payout">
    <h2>Potential payout: <span class="num">{(potential / 1_000_000).toFixed(2)}</span></h2>
    <h2>Last payout: <span class="num">{(last / 1_000_000).toFixed(2)}</span></h2>
</div>

<style>
    .payout {
        --w: 240px;
        --h: 72px;

        width: var(--w);
        height: var(--h);
        padding: 8px 12px;
        border: 3px solid #420099;
        border-radius: 12px;
        background: #111;
        color: #fff;

        /* nur EIN Layout wählen */
        display: flex;
        flex-direction: column;   /* untereinander */
        justify-content: center;  /* vertikal mittig in fester Höhe */
        align-items: flex-start;  /* linksbündig */
        gap: 4px;
        margin-top: 10px;
    }

    .payout h2 {
        margin: 0;
        line-height: 1.1;
    }

    .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
</style>