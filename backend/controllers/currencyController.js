/**
 * ServiceHub — Currency Controller
 * Exposes live exchange rates to the frontend.
 */
const { getRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');

// ── GET /api/currency/rates ───────────────────────────────────────────────────
const getCurrencyRates = async (req, res) => {
  try {
    const rates = await getRates();
    res.json({
      base:       'USD',
      rates,
      currencies: SUPPORTED_CURRENCIES,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('getCurrencyRates error:', err);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
};

module.exports = { getCurrencyRates };
