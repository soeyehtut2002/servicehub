/**
 * ServiceHub — Currency Service
 * Fetches live exchange rates from open.er-api.com (free, no API key required).
 * Rates are cached in-memory for CACHE_TTL_MS to avoid hammering the external API.
 * Falls back to FALLBACK_RATES if the API is unreachable.
 */

const https = require('https');

const SUPPORTED_CURRENCIES = ['USD', 'THB', 'MMK', 'CNY'];

// Safe fallback rates (relative to USD) used when the API is unavailable
const FALLBACK_RATES = {
  USD: 1,
  THB: 36.5,
  MMK: 2100,
  CNY: 7.25,
};

// Cache: refresh every 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;
let _cachedRates    = null;
let _cacheTimestamp = 0;

/**
 * Fetch JSON from a URL (native https — no extra deps needed).
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/**
 * Returns live exchange rates { USD, THB, MMK, CNY } (relative to USD).
 * Uses a 10-minute in-memory cache. Falls back gracefully on failure.
 */
async function getRates() {
  const now = Date.now();
  if (_cachedRates && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cachedRates;
  }

  try {
    const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
    if (data && data.result === 'success' && data.rates) {
      const rates = {};
      for (const cur of SUPPORTED_CURRENCIES) {
        rates[cur] = data.rates[cur] ?? FALLBACK_RATES[cur];
      }
      _cachedRates    = rates;
      _cacheTimestamp = now;
      return rates;
    }
    throw new Error('Unexpected API response format');
  } catch (err) {
    console.warn('[currencyService] Failed to fetch live rates, using fallback:', err.message);
    // Return fallback but do NOT update cache so next request retries the API
    return _cachedRates ?? FALLBACK_RATES;
  }
}

/**
 * Convert an amount from one currency to another using the given rates.
 * @param {number} amount
 * @param {string} from   — source currency code (e.g. 'USD')
 * @param {string} to     — target currency code (e.g. 'THB')
 * @param {object} rates  — rates object from getRates()
 * @returns {number}
 */
function convert(amount, from, to, rates) {
  if (from === to) return amount;
  const amountInUSD = amount / (rates[from] ?? FALLBACK_RATES[from] ?? 1);
  return amountInUSD * (rates[to] ?? FALLBACK_RATES[to] ?? 1);
}

/**
 * Get the exchange rate between two currencies.
 * @param {string} from
 * @param {string} to
 * @param {object} rates
 * @returns {number}
 */
function getRate(from, to, rates) {
  if (from === to) return 1;
  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const toRate   = rates[to]   ?? FALLBACK_RATES[to]   ?? 1;
  return toRate / fromRate;
}

module.exports = { getRates, convert, getRate, SUPPORTED_CURRENCIES, FALLBACK_RATES };
