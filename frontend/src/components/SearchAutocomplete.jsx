import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { Search, Wrench, Star } from 'lucide-react';

const SearchAutocomplete = ({ placeholder = 'Search services...', onClose }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (val) => {
    if (!val.trim()) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await API.get(`/services?keyword=${encodeURIComponent(val)}&limit=6`);
      setSuggestions(res.data.services || []);
      setOpen(true);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (service) => {
    setOpen(false);
    setQuery('');
    navigate(`/services/${service.id}`);
    onClose?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/services?keyword=${encodeURIComponent(query.trim())}`);
    setQuery('');
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.6 }}>
          <Search size={15} strokeWidth={2} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%',
            background: 'rgba(0,255,255,0.04)',
            border: '1px solid rgba(0,255,255,0.15)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            padding: '9px 16px 9px 36px',
            outline: 'none',
            transition: 'var(--transition)',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.target.style.borderColor = 'rgba(0,255,255,0.4)'}
          onMouseLeave={e => e.target.style.borderColor = open ? 'var(--primary)' : 'rgba(0,255,255,0.15)'}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid rgba(0,255,255,0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} />
        )}
      </form>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,255,255,0.2)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,255,0.08)',
          overflow: 'hidden',
          zIndex: 999,
          animation: 'slideUp 0.15s ease',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 14px',
                background: i === activeIdx ? 'rgba(0,255,255,0.08)' : 'transparent',
                border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(0,255,255,0.06)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = i === activeIdx ? 'rgba(0,255,255,0.08)' : 'transparent'}
            >
              {s.image_url ? (
                <img src={`http://localhost:5000${s.image_url}`} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>
                  <Wrench size={16} strokeWidth={2} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{s.category}</span>
                  <span>·</span>
                  <span style={{ color: 'var(--primary)' }}>${parseFloat(s.price).toFixed(2)}</span>
                </div>
              </div>
              {parseFloat(s.avg_rating) > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#F59E0B', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Star size={11} fill="#F59E0B" strokeWidth={0} />
                  {parseFloat(s.avg_rating).toFixed(1)}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSubmit}
            style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'rgba(0,255,255,0.06)', border: 'none', borderTop: '1px solid rgba(0,255,255,0.1)', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', textAlign: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,255,0.06)'}
          >
            See all results for "{query}" →
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
