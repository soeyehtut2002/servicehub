/**
 * ServiceHub — CurrencySelector
 * Compact dropdown to select from 4 supported currencies.
 * Syncs with CurrencyContext.
 */
import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '../utils/currency';

const CurrencySelector = ({ compact = false }) => {
  const { preferredCurrency, setPreferredCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = SUPPORTED_CURRENCIES.find(c => c.code === preferredCurrency) || SUPPORTED_CURRENCIES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="cs-wrap" ref={ref}>
      <button
        id="currency-selector-btn"
        className={`cs-trigger ${compact ? 'cs-compact' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Change display currency"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cs-flag">{current.flag}</span>
        <span className="cs-code">{current.code}</span>
        <svg className={`cs-chevron${open ? ' open' : ''}`} viewBox="0 0 12 8" fill="none" width="10" height="10">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="cs-dropdown" role="listbox">
          <div className="cs-label">Display Currency</div>
          {SUPPORTED_CURRENCIES.map(cur => (
            <button
              key={cur.code}
              role="option"
              aria-selected={cur.code === preferredCurrency}
              className={`cs-option ${cur.code === preferredCurrency ? 'active' : ''}`}
              onClick={() => { setPreferredCurrency(cur.code); setOpen(false); }}
            >
              <span className="cs-opt-flag">{cur.flag}</span>
              <span className="cs-opt-code">{cur.code}</span>
              <span className="cs-opt-name">{cur.name}</span>
              {cur.code === preferredCurrency && <span className="cs-check">✓</span>}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .cs-wrap { position: relative; display: inline-block; }

        .cs-trigger {
          display: flex; align-items: center; gap: 5px;
          background: var(--bg-surface, #f8fafc);
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 20px;
          padding: 5px 10px 5px 8px;
          font-size: .82rem; font-weight: 700;
          color: var(--text-primary, #0f172a);
          cursor: pointer; transition: all .2s;
          white-space: nowrap;
        }
        .cs-trigger:hover {
          border-color: var(--primary, #0ea5e9);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }
        .cs-compact { padding: 4px 8px 4px 6px; font-size: .78rem; }

        .cs-flag { font-size: 1rem; line-height: 1; }
        .cs-code { letter-spacing: .03em; }
        .cs-chevron { color: var(--text-muted, #94a3b8); transition: transform .2s; flex-shrink:0; }
        .cs-chevron.open { transform: rotate(180deg); }

        .cs-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #fff;
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(14,165,233,.13), 0 2px 8px rgba(0,0,0,.08);
          overflow: hidden;
          min-width: 180px;
          z-index: 9999;
          animation: csSlide .15s ease;
        }
        @keyframes csSlide { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }

        .cs-label {
          font-size: .68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: .08em; color: var(--text-muted, #94a3b8);
          padding: 10px 14px 4px;
        }

        .cs-option {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px;
          width: 100%; background: none; border: none;
          text-align: left; cursor: pointer; transition: background .15s;
        }
        .cs-option:hover { background: rgba(14,165,233,.07); }
        .cs-option.active { background: rgba(14,165,233,.1); }

        .cs-opt-flag { font-size: 1.1rem; flex-shrink:0; }
        .cs-opt-code { font-size: .85rem; font-weight: 700; color: var(--text-primary, #0f172a); min-width: 32px; }
        .cs-opt-name { font-size: .78rem; color: var(--text-muted, #94a3b8); flex:1; }
        .cs-check { font-size: .8rem; color: var(--primary, #0ea5e9); font-weight: 700; margin-left: auto; }
      `}</style>
    </div>
  );
};

export default CurrencySelector;
