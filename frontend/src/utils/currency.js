/**
 * ServiceHub — Currency Utility (v2)
 * Supports live rates (passed in) with fallback to static values.
 * Currencies: USD, THB, MMK, CNY
 */

// ── Static fallback rates (relative to USD) ───────────────────────────────────
export const FALLBACK_RATES = {
  USD: 1,
  THB: 36.5,
  MMK: 2100,
  CNY: 7.25,
};

// ── Supported currencies with display metadata ────────────────────────────────
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$',  flag: '🇺🇸', name: 'US Dollar' },
  { code: 'THB', symbol: '฿',  flag: '🇹🇭', name: 'Thai Baht' },
  { code: 'MMK', symbol: 'Ks', flag: '🇲🇲', name: 'Myanmar Kyat' },
  { code: 'CNY', symbol: '¥',  flag: '🇨🇳', name: 'Chinese Yuan' },
];

/** Get display metadata for a currency code */
export function getCurrencyMeta(code) {
  if (!code) return SUPPORTED_CURRENCIES[0]; // never fall through on null/undefined
  const found = SUPPORTED_CURRENCIES.find(c => c.code === String(code).toUpperCase());
  return found || SUPPORTED_CURRENCIES[0];
}

/**
 * Convert an amount between currencies using provided rates (or fallback).
 */
export function convertAmount(amount, from, to, rates = FALLBACK_RATES) {
  const amt = parseFloat(amount) || 0;
  if (from === to) return amt;
  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const toRate   = rates[to]   ?? FALLBACK_RATES[to]   ?? 1;
  return (amt / fromRate) * toRate;
}

/**
 * Format a numeric amount in a given currency.
 * @param {number} amount
 * @param {string} currency  e.g. 'THB'
 * @returns {string}  e.g. '฿3,650'
 */
export function formatCurrency(amount, currency = 'USD') {
  const amt = parseFloat(amount) || 0;
  const meta = getCurrencyMeta(currency);
  const locale = { USD: 'en-US', THB: 'th-TH', MMK: 'en-US', CNY: 'zh-CN' }[currency] || 'en-US';
  const digits = currency === 'MMK' ? 0 : currency === 'THB' ? 0 : 2;
  return `${meta.symbol}${amt.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: currency === 'USD' ? 2 : 0 })}`;
}

/**
 * Format a price in all 4 currencies.
 * @param {number|string} amount  — amount in `fromCurrency`
 * @param {string} fromCurrency   — source currency (default 'USD')
 * @param {object} rates          — live rates object (fallback used if omitted)
 */
export function formatAllCurrencies(amount, fromCurrency = 'USD', rates = FALLBACK_RATES) {
  const r = {};
  for (const cur of SUPPORTED_CURRENCIES) {
    const converted = convertAmount(amount, fromCurrency, cur.code, rates);
    r[cur.code.toLowerCase()] = formatCurrency(converted, cur.code);
  }
  return r; // { usd, thb, mmk, cny }
}

/**
 * Build the conversion display string.
 * e.g. "100 USD ≈ 3,650 THB"
 */
export function buildConversionLabel(amount, from, to, rates = FALLBACK_RATES) {
  if (from === to) return null;
  const converted = convertAmount(amount, from, to, rates);
  const fromMeta  = getCurrencyMeta(from);
  const toMeta    = getCurrencyMeta(to);
  const fromFmt   = `${fromMeta.symbol}${parseFloat(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const toFmt     = formatCurrency(converted, to);
  return `${fromFmt} ${from} ≈ ${toFmt} ${to}`;
}
