import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import { SUPPORTED_CURRENCIES, getCurrencyMeta, formatCurrency, convertAmount, buildConversionLabel } from '../utils/currency';
import { Calendar, X, CreditCard, ArrowLeftRight, Check, Clock, MapPin, CheckCircle } from 'lucide-react';

const BookingModal = ({ service, onClose, onBooked }) => {
  const { rates, preferredCurrency } = useCurrency();

  const [slots,          setSlots]          = useState([]);
  const [selectedSlot,   setSelectedSlot]   = useState(null);
  const [filterDate,     setFilterDate]     = useState('');
  const [useManualDate,  setUseManualDate]  = useState(false);
  const [date,           setDate]           = useState('');
  const [time,           setTime]           = useState('');
  const [notes,          setNotes]          = useState('');
  const [location,       setLocation]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [slotsLoading,   setSlotsLoading]   = useState(true);

  // Currency selection
  const nativeCurrency   = service.currency || 'USD';
  const nativePrice      = parseFloat(service.price) || 0;
  const [paymentCurrency, setPaymentCurrency] = useState(preferredCurrency);

  const nativeMeta  = getCurrencyMeta(nativeCurrency);
  const payMeta     = getCurrencyMeta(paymentCurrency);
  const convertedAmt = convertAmount(nativePrice, nativeCurrency, paymentCurrency, rates);
  const exchangeRate = (nativePrice > 0 && paymentCurrency !== nativeCurrency)
    ? (convertedAmt / nativePrice).toFixed(5)
    : 1;

  const today = new Date().toISOString().split('T')[0];

  // Fetch available time slots for this service
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await API.get(`/slots/service/${service.id}`, {
          params: { from: today },
        });
        setSlots(res.data);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [service.id]);

  const hasSlots = slots.length > 0;

  const capColor = (s) => {
    if (s.is_full === true || s.is_booked === true) return '#FF4757';
    const pct = (s.booked_count || 0) / (s.max_capacity || 1);
    if (pct >= 0.5) return '#FF9800';
    return '#6C63FF';
  };

  // Group slots by date
  const groupedSlots = slots.reduce((acc, slot) => {
    const d = String(slot.slot_date).substring(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(slot);
    return acc;
  }, {});

  const filteredDates = filterDate
    ? { [filterDate]: groupedSlots[filterDate] || [] }
    : groupedSlots;

  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSlots && !useManualDate && !selectedSlot) {
      return toast.error('Please select a time slot');
    }
    if (useManualDate && (!date || !time)) {
      return toast.error('Please select date and time');
    }

    let booking_date, time_slot_id;

    if (selectedSlot && !useManualDate) {
      const slot = slots.find(s => s.id === selectedSlot);
      booking_date  = new Date(`${slot.slot_date}T${slot.start_time}`).toISOString();
      time_slot_id  = slot.id;
    } else {
      booking_date = new Date(`${date}T${time}`).toISOString();
      time_slot_id = null;
    }

    setLoading(true);
    try {
      await API.post('/bookings', {
        service_id:       service.id,
        booking_date,
        notes:            notes.trim() || null,
        location:         location.trim() || null,
        time_slot_id:     time_slot_id || undefined,
        payment_currency: paymentCurrency,
      });
      toast.success('Booking confirmed!');
      if (onBooked) onBooked();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const conversionLabel = paymentCurrency !== nativeCurrency
    ? buildConversionLabel(nativePrice, nativeCurrency, paymentCurrency, rates)
    : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content bm-content">
        <div className="modal-header">
          <h3 className="modal-title" style={{display:'flex',alignItems:'center',gap:8}}><Calendar size={17} strokeWidth={2}/>Book Service</h3>
          <button className="modal-close" onClick={onClose}><X size={16} strokeWidth={2.5}/></button>
        </div>

        {/* Service Summary */}
        <div className="booking-service-info">
          <p className="booking-service-title">{service.title}</p>
          <div style={{ textAlign: 'right' }}>
            <div className="price-tag" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
              {nativeMeta.symbol}{nativePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              <span style={{ fontSize: '.7em', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 3 }}>{nativeCurrency}</span>
            </div>
          </div>
        </div>

        {/* ── Currency Selection + Conversion Preview ──────────────────── */}
        <div className="bm-currency-box">
          <div className="bm-currency-row">
            <label className="form-label" style={{ margin: 0, display:'flex', alignItems:'center', gap:6 }}><CreditCard size={14} strokeWidth={2}/>Pay in</label>
            <div className="bm-cur-pills">
              {SUPPORTED_CURRENCIES.map(cur => (
                <button
                  key={cur.code}
                  type="button"
                  className={`bm-cur-pill ${paymentCurrency === cur.code ? 'active' : ''}`}
                  onClick={() => setPaymentCurrency(cur.code)}
                  title={cur.name}
                >
                  {cur.flag} {cur.code}
                </button>
              ))}
            </div>
          </div>

          {conversionLabel ? (
            <div className="bm-conversion-line">
              <span className="bm-conversion-icon" style={{display:'flex',alignItems:'center'}}><ArrowLeftRight size={15} strokeWidth={2}/></span>
              <span className="bm-conversion-text">{conversionLabel}</span>
              <span className="bm-rate-chip">rate: {exchangeRate}</span>
            </div>
          ) : (
            <div className="bm-conversion-line bm-same-currency">
              <span className="bm-conversion-icon" style={{display:'flex',alignItems:'center',color:'var(--success)'}}><Check size={15} strokeWidth={2.5}/></span>
              <span className="bm-conversion-text">Paying in service currency</span>
            </div>
          )}

          <div className="bm-you-pay">
            You pay: <strong>{payMeta.symbol}{convertedAmt.toLocaleString('en-US', { maximumFractionDigits: paymentCurrency === 'USD' ? 2 : 0 })} {paymentCurrency}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">

          {/* ── Time Slot Picker ───────────────────────────────────────── */}
          {slotsLoading ? (
            <div className="spinner-container" style={{minHeight:80}}><div className="spinner"/></div>
          ) : hasSlots ? (
            <div className="form-group">
              <div className="slot-header">
                <label className="form-label" style={{display:'flex',alignItems:'center',gap:6}}><Clock size={14} strokeWidth={2}/>Available Time Slots</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setUseManualDate(!useManualDate); setSelectedSlot(null); }}
                >
                  {useManualDate ? 'Use Slots' : 'Enter Manually'}
                </button>
              </div>

              {!useManualDate ? (
                <>
                  <input
                    type="date" className="input mb-3"
                    min={today} value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    placeholder="Filter by date"
                  />
                  <div className="slot-scroll">
                    {Object.entries(filteredDates).length === 0 ? (
                      <p className="text-muted" style={{textAlign:'center',padding:'1rem'}}>No slots for this date</p>
                    ) : (
                      Object.entries(filteredDates).map(([d, daySlots]) => (
                        <div key={d} className="slot-day">
                          <div className="slot-day-label">
                            {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                          </div>
                          <div className="slot-grid">
                    {daySlots.map(slot => {
                              const full   = slot.is_full === true || slot.is_booked === true || Number(slot.available_spots) <= 0;
                              const avail  = Number(slot.available_spots ?? ((slot.max_capacity || 1) - (slot.booked_count || 0)));
                              const max    = Number(slot.max_capacity) || 1;
                              const col    = capColor(slot);
                              const pct    = Math.min(100, Math.round(((slot.booked_count||0)/max)*100));
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={full}
                                  className={`slot-btn ${full ? 'slot-full-btn' : ''} ${selectedSlot === slot.id ? 'selected' : ''}`}
                                  style={selectedSlot===slot.id ? {borderColor:col,boxShadow:`0 0 0 2px ${col}44`} : {}}
                                  onClick={() => setSelectedSlot(slot.id)}
                                >
                                  <span className="slot-time">{fmtTime(slot.start_time)}</span>
                                  <span className="slot-end">– {fmtTime(slot.end_time)}</span>
                                  {max > 1 ? (
                                    <>
                                      <div className="slot-cap-bar">
                                        <div style={{width:`${pct}%`,height:'100%',background:col,borderRadius:2,transition:'width .3s'}}/>
                                      </div>
                                      {full
                                        ? <span className="slot-tag slot-tag-full">Full</span>
                                        : <span className="slot-spots">{avail} left</span>
                                      }
                                    </>
                                  ) : (
                                    full && <span className="slot-tag slot-tag-full">Booked</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="input" min={today} value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} required />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No slots defined — fall back to date/time input */
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="input" min={today} value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{display:'flex',alignItems:'center',gap:6}}><MapPin size={14} strokeWidth={2}/>Service Location / Address</label>
            <textarea
              className="textarea"
              placeholder="Enter your address or where you need the service..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              rows={2} style={{ resize: 'none' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes for Provider (optional)</label>
            <textarea
              className="textarea"
              placeholder="Any specific requirements or information..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="booking-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Booking...' : <span style={{display:'flex',alignItems:'center',gap:6}}><CheckCircle size={15} strokeWidth={2}/>Confirm &amp; Pay {payMeta.flag} {paymentCurrency}</span>}
            </button>
          </div>
        </form>

        <style>{`
          .bm-content { max-width: 540px; }
          .booking-service-info { display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-md); padding:var(--space-4); margin-bottom:var(--space-4); }
          .booking-service-title { font-weight:700; font-size:.95rem; }

          /* ── Currency Box ────────────────────────────────────────────── */
          .bm-currency-box { background:linear-gradient(135deg,rgba(108,99,255,.08),rgba(14,165,233,.06)); border:1px solid rgba(108,99,255,.22); border-radius:var(--radius-lg); padding:var(--space-4); margin-bottom:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3); }
          .bm-currency-row { display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap; }
          .bm-cur-pills { display:flex; gap:6px; flex-wrap:wrap; }
          .bm-cur-pill { padding:5px 12px; border-radius:20px; font-size:.8rem; font-weight:700; border:1.5px solid var(--border); background:#fff; color:var(--text-secondary); cursor:pointer; transition:all .18s; }
          .bm-cur-pill.active { background:linear-gradient(135deg,#6C63FF,#0ea5e9); border-color:transparent; color:#fff; box-shadow:0 2px 8px rgba(108,99,255,.35); }
          .bm-cur-pill:hover:not(.active) { border-color:var(--primary); color:var(--primary-dark); background:rgba(14,165,233,.06); }

          .bm-conversion-line { display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(255,255,255,.55); border-radius:var(--radius-md); border:1px solid rgba(108,99,255,.15); flex-wrap:wrap; }
          .bm-conversion-icon { display:flex; align-items:center; flex-shrink:0; }
          .bm-conversion-text { font-size:.88rem; font-weight:700; color:var(--text-primary); flex:1; min-width:180px; }
          .bm-rate-chip { font-size:.7rem; background:rgba(108,99,255,.12); color:#6C63FF; border-radius:var(--radius-full); padding:2px 8px; font-weight:600; white-space:nowrap; }
          .bm-same-currency .bm-conversion-text { color:var(--text-muted); font-weight:400; }
          .bm-you-pay { font-size:.82rem; color:var(--text-secondary); }
          .bm-you-pay strong { color:var(--success); font-size:.95rem; }

          .booking-form { display:flex; flex-direction:column; gap:var(--space-4); }
          .form-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); }
          .booking-actions { display:flex; gap:var(--space-3); justify-content:flex-end; margin-top:var(--space-2); }
          .slot-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2); }
          .slot-scroll { max-height: 280px; overflow-y: auto; display:flex; flex-direction:column; gap:var(--space-3); padding-right:4px; }
          .slot-day {}
          .slot-day-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:var(--space-2); }
          .slot-grid { display:flex; flex-wrap:wrap; gap:var(--space-2); }
          .slot-btn { position:relative; padding:8px 12px; border-radius:var(--radius-md); font-size:.8rem; font-weight:600; background:rgba(108,99,255,.12); border:1px solid rgba(108,99,255,.3); color:var(--primary-light); cursor:pointer; transition:var(--transition); display:flex; flex-direction:column; align-items:center; min-width:88px; gap:2px; }
          .slot-time { font-size:.82rem; font-weight:700; }
          .slot-btn.selected { background:rgba(108,99,255,.35); border-color:var(--primary); }
          .slot-full-btn { background:rgba(255,255,255,.03); border-color:var(--border); color:var(--text-muted); cursor:not-allowed; opacity:.55; }
          .slot-btn:hover:not(.slot-full-btn):not(.selected) { background:rgba(108,99,255,.22); transform:translateY(-1px); }
          .slot-cap-bar { width:100%; height:3px; background:rgba(255,255,255,.1); border-radius:2px; overflow:hidden; margin-top:2px; }
          .slot-spots { font-size:.65rem; color:var(--success); font-weight:600; }
          .slot-end { font-size:.7rem; color:var(--text-muted); font-weight:400; }
          .slot-tag { position:absolute; top:-6px; right:-6px; font-size:.6rem; padding:1px 5px; border-radius:4px; font-weight:700; }
          .slot-tag-full { background:var(--error); color:#fff; }
          .mb-3 { margin-bottom:var(--space-3); }
          @media(max-width:480px) { 
            .form-row{grid-template-columns:1fr;} 
            .booking-service-info { flex-direction: column; align-items: flex-start; gap: var(--space-2); }
            .bm-conversion-text { font-size: 0.8rem; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BookingModal;
