<script lang="ts">
  /** Public API: balance is in MAJOR units (e.g., 123.45) */
  export type Currency =
    | 'USD' | 'CAD' | 'JPY' | 'EUR' | 'RUB' | 'CNY' | 'PHP' | 'INR' | 'IDR' | 'KRW'
    | 'BRL' | 'MXN' | 'DKK' | 'PLN' | 'VND' | 'TRY' | 'CLP' | 'ARS' | 'PEN' | 'XGC' | 'XSC';

  export type UIBalance = { amount: number; currency: string };
  export let balance: UIBalance = { amount: 0, currency: 'EUR' };

  /** UI text + formatting options */
  export let label = 'BALANCE';
  export let locale: string = 'en-US';

  /** 🔧 Vom Parent setzbare Schriftgrößen (px) */
  export let labelFontSize: number = 11;
  export let amountFontSize: number = 20;

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

  function formatAmount(n: number, decimals: number) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
  }

  function displayBalance(bal: UIBalance): string {
    const meta = CurrencyMeta[bal.currency as Currency] ?? {
      symbol: bal.currency,
      decimals: 2,
      symbolAfter: true,
    };
    const amt = formatAmount(bal.amount, meta.decimals);
    return meta.symbolAfter ? `${amt} ${meta.symbol}` : `${meta.symbol}${amt}`;
  }
</script>

<!-- CSS-Variablen aus Props injizieren -->
<div
  class="balance"
  role="group"
  aria-label="Balance"
  style={`--label-fs:${labelFontSize}px; --amount-fs:${amountFontSize}px;`}
>
  <div class="label">{label}</div>
  <div class="amount">{displayBalance(balance)}</div>
</div>

<style>
  .balance {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    min-width: 140px;      /* grows with content */
    user-select: none;
    white-space: nowrap;
  }

  .label {
    font-size: var(--label-fs, 11px);
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #39c7ff;        /* cyan like your mock */
    opacity: 0.95;
  }

  .amount {
    font-size: var(--amount-fs, 20px);
    font-weight: 800;
    line-height: 1.05;
    color: #fff;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }
</style>
