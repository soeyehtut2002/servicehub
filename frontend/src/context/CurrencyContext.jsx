/**
 * ServiceHub — Currency Context
 * Fetches live rates from /api/currency/rates (10-min localStorage cache).
 * Provides: rates, preferredCurrency, setPreferredCurrency, convert, format.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { FALLBACK_RATES, convertAmount, formatCurrency } from '../utils/currency';

const CACHE_KEY     = 'sh_currency_rates';
const CACHE_TS_KEY  = 'sh_currency_rates_ts';
const CACHE_TTL_MS  = 10 * 60 * 1000; // 10 minutes
const PREF_KEY      = 'sh_preferred_currency';

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const [rates,             setRates]             = useState(FALLBACK_RATES);
  const [preferredCurrency, setPreferredCurrencyState] = useState(
    () => localStorage.getItem(PREF_KEY) || 'USD'
  );
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Fetch / use cached rates
  useEffect(() => {
    const loadRates = async () => {
      try {
        const cachedTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0');
        const now      = Date.now();
        if (now - cachedTs < CACHE_TTL_MS) {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            setRates(JSON.parse(cached));
            setRatesLoaded(true);
            return;
          }
        }
        const res = await API.get('/currency/rates');
        if (res.data?.rates) {
          setRates(res.data.rates);
          localStorage.setItem(CACHE_KEY, JSON.stringify(res.data.rates));
          localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        }
      } catch {
        // API unreachable — fallback rates are already set in state
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try { setRates(JSON.parse(cached)); } catch { /* ignore */ }
        }
      } finally {
        setRatesLoaded(true);
      }
    };
    loadRates();
  }, []);

  const setPreferredCurrency = useCallback((code) => {
    setPreferredCurrencyState(code);
    localStorage.setItem(PREF_KEY, code);
  }, []);

  /** Convert amount from `from` currency to `to` currency */
  const convert = useCallback((amount, from, to) => {
    return convertAmount(amount, from, to, rates);
  }, [rates]);

  /** Format an amount (already in `currency`) for display */
  const format = useCallback((amount, currency) => {
    return formatCurrency(amount, currency);
  }, []);

  /** Convert and format in one step */
  const convertAndFormat = useCallback((amount, from, to) => {
    const converted = convertAmount(amount, from, to, rates);
    return formatCurrency(converted, to);
  }, [rates]);

  return (
    <CurrencyContext.Provider value={{
      rates,
      ratesLoaded,
      preferredCurrency,
      setPreferredCurrency,
      convert,
      format,
      convertAndFormat,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
};

export default CurrencyContext;
