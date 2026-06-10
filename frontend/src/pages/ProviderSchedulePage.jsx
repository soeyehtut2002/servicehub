import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DEFAULT_SCHEDULE = DAYS.map((_, i) => ({
  day_of_week: i,
  start_time:  '09:00',
  end_time:    '18:00',
  is_active:   i >= 1 && i <= 5,  // Mon-Fri default
}));

export default function ProviderSchedulePage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service,      setService]     = useState(null);
  const [schedule,     setSchedule]    = useState(DEFAULT_SCHEDULE);
  const [blocked,      setBlocked]     = useState([]);
  const [slots,        setSlots]       = useState([]);
  const [loadingSvc,   setLoadingSvc]  = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [generating,   setGenerating]  = useState(false);

  // Auto-gen form
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' });

  const today = new Date().toISOString().split('T')[0];

  // ── Load service + schedule + blocked dates ───────────────────────────────
  const load = useCallback(async () => {
    if (!serviceId) return;
    setLoadingSvc(true);
    try {
      const [svcR, schR, blkR, slotsR] = await Promise.all([
        API.get(`/services/${serviceId}`),
        API.get(`/schedule/${serviceId}`).catch(() => ({ data: [] })),
        API.get(`/schedule/${serviceId}/blocked`).catch(() => ({ data: [] })),
        API.get(`/slots/service/${serviceId}`).catch(() => ({ data: [] })),
      ]);
      setService(svcR.data);

      if (schR.data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map(def => {
          const found = schR.data.find(d => d.day_of_week === def.day_of_week);
          return found
            ? { ...def, start_time: found.start_time.substring(0,5), end_time: found.end_time.substring(0,5), is_active: found.is_active }
            : def;
        });
        setSchedule(merged);
      }
      setBlocked(blkR.data);
      setSlots(slotsR.data);
    } catch (err) {
      toast.error('Failed to load service data');
    } finally {
      setLoadingSvc(false);
    }
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const updateDay = (idx, field, value) => {
    setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await API.put(`/schedule/${serviceId}`, { schedule });
      toast.success('Schedule saved ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save schedule');
    } finally { setSaving(false); }
  };

  // ── Blocked dates ─────────────────────────────────────────────────────────
  const addBlocked = async () => {
    if (!newBlock.date) return toast.error('Select a date to block');
    try {
      const r = await API.post(`/schedule/${serviceId}/blocked`, { blocked_date: newBlock.date, reason: newBlock.reason });
      setBlocked(prev => [...prev, r.data].sort((a,b) => a.blocked_date.localeCompare(b.blocked_date)));
      setNewBlock({ date: '', reason: '' });
      toast.success('Date blocked');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to block date');
    }
  };

  const removeBlocked = async (id) => {
    try {
      await API.delete(`/schedule/${serviceId}/blocked/${id}`);
      setBlocked(prev => prev.filter(b => b.id !== id));
      toast.success('Date unblocked');
    } catch { toast.error('Failed to remove'); }
  };

  // ── Auto-generate slots ───────────────────────────────────────────────────
  const generateSlots = async () => {
    if (!fromDate || !toDate) return toast.error('Select a date range');
    if (toDate < fromDate) return toast.error('End date must be after start date');
    setGenerating(true);
    try {
      const r = await API.post(`/schedule/${serviceId}/generate-slots`, { from_date: fromDate, to_date: toDate });
      toast.success(`Created ${r.data.created} slot(s) across ${Math.ceil((new Date(toDate)-new Date(fromDate))/(86400000))+1} days`);
      load(); // refresh slot list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally { setGenerating(false); }
  };

  // ── Mini calendar ─────────────────────────────────────────────────────────
  const slotDateSet   = new Set(slots.map(s => String(s.slot_date).substring(0,10)));
  const blockedDateSet= new Set(blocked.map(b => b.blocked_date));

  const buildCalendar = () => {
    const now  = new Date();
    const year = now.getFullYear();
    const mon  = now.getMonth();
    const first= new Date(year, mon, 1);
    const last = new Date(year, mon + 1, 0);
    const cells= [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      const ds = `${year}-${String(mon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(year, mon, d).getDay();
      const daySchedule = schedule[dow];
      cells.push({
        d, ds,
        hasSlots:   slotDateSet.has(ds),
        isBlocked:  blockedDateSet.has(ds),
        isWorkDay:  daySchedule?.is_active,
        isPast:     ds < today,
      });
    }
    return cells;
  };

  const calCells = buildCalendar();
  const calMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (loadingSvc) {
    return (
      <div className="page-wrapper" style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div className="spinner"/>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="schedule-page">

        {/* Header */}
        <div className="schedule-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/provider')}>← Back</button>
          <div>
            <h1 className="schedule-h1">📅 Schedule Manager</h1>
            {service && <p className="schedule-subtitle">Service: <strong>{service.title}</strong></p>}
          </div>
        </div>

        <div className="schedule-grid">

          {/* ── Left column: Weekly hours + blocked dates ── */}
          <div className="schedule-left">

            {/* Weekly Hours */}
            <div className="scard">
              <div className="scard-head">
                <h3>🕐 Working Hours</h3>
                <p className="scard-sub">Set available hours per day of week</p>
              </div>
              <div className="schedule-days">
                {schedule.map((day, idx) => (
                  <div key={idx} className={`day-row${day.is_active ? '' : ' day-off'}`}>
                    <label className="day-toggle">
                      <input
                        type="checkbox"
                        checked={day.is_active}
                        onChange={e => updateDay(idx, 'is_active', e.target.checked)}
                      />
                      <span className="day-name">{DAYS[idx]}</span>
                    </label>
                    {day.is_active ? (
                      <div className="day-times">
                        <input
                          type="time" className="input input-sm"
                          value={day.start_time}
                          onChange={e => updateDay(idx, 'start_time', e.target.value)}
                        />
                        <span className="day-sep">–</span>
                        <input
                          type="time" className="input input-sm"
                          value={day.end_time}
                          onChange={e => updateDay(idx, 'end_time', e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="day-closed">Closed</span>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={saveSchedule} disabled={saving} style={{marginTop:'var(--space-4)',width:'100%'}}>
                {saving ? 'Saving…' : '💾 Save Schedule'}
              </button>
            </div>

            {/* Blocked Dates */}
            <div className="scard">
              <div className="scard-head">
                <h3>🚫 Blocked Dates</h3>
                <p className="scard-sub">Mark holidays or days off — no bookings will be shown</p>
              </div>
              <div className="block-form">
                <input
                  type="date" className="input" min={today}
                  value={newBlock.date}
                  onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))}
                />
                <input
                  type="text" className="input"
                  placeholder="Reason (optional)"
                  value={newBlock.reason}
                  onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))}
                />
                <button className="btn btn-danger" onClick={addBlocked}>Block</button>
              </div>
              <div className="blocked-list">
                {blocked.length === 0
                  ? <p className="text-muted" style={{textAlign:'center',padding:'12px'}}>No dates blocked</p>
                  : blocked.map(b => (
                    <div key={b.id} className="blocked-item">
                      <div>
                        <div className="blocked-date">{new Date(b.blocked_date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                        {b.reason && <div className="blocked-reason">{b.reason}</div>}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeBlocked(b.id)}>✕</button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* ── Right column: Auto-generate + calendar ── */}
          <div className="schedule-right">

            {/* Auto-generate */}
            <div className="scard">
              <div className="scard-head">
                <h3>⚡ Auto-Generate Slots</h3>
                <p className="scard-sub">
                  Creates slots for every working day in the range.<br/>
                  Skips blocked dates. Uses service duration ({service?.duration_hours || 1}h) and team count ({service?.team_count || 1}).
                </p>
              </div>
              <div className="gen-form">
                <div>
                  <label className="form-label">From Date</label>
                  <input type="date" className="input" min={today} value={fromDate} onChange={e => setFromDate(e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">To Date</label>
                  <input type="date" className="input" min={fromDate || today} value={toDate} onChange={e => setToDate(e.target.value)}/>
                </div>
              </div>
              <button className="btn btn-primary" style={{width:'100%',marginTop:'var(--space-3)'}} onClick={generateSlots} disabled={generating || !fromDate || !toDate}>
                {generating ? '⏳ Generating…' : '⚡ Generate Slots'}
              </button>
            </div>

            {/* Mini Calendar */}
            <div className="scard">
              <div className="scard-head">
                <h3>📆 {calMonth}</h3>
                <div className="cal-legend">
                  <span className="cal-leg-dot" style={{background:'#6c63ff'}}/>Slots
                  <span className="cal-leg-dot" style={{background:'#FF4757',marginLeft:8}}/>Blocked
                  <span className="cal-leg-dot" style={{background:'rgba(255,255,255,.12)',marginLeft:8}}/>Working
                </div>
              </div>
              <div className="mini-cal">
                {SHORT.map(d => <div key={d} className="cal-head-cell">{d}</div>)}
                {calCells.map((cell, i) => {
                  if (!cell) return <div key={`e${i}`}/>;
                  let bg = 'transparent';
                  let col = 'var(--text-muted)';
                  if (cell.isPast)     { bg='transparent'; col='rgba(255,255,255,.2)'; }
                  else if (cell.isBlocked) { bg='rgba(255,71,87,.2)'; col='#FF4757'; }
                  else if (cell.hasSlots)  { bg='rgba(108,99,255,.25)'; col='var(--primary-light)'; }
                  else if (cell.isWorkDay) { bg='rgba(255,255,255,.06)'; col='var(--text-secondary)'; }
                  return (
                    <div key={cell.d} className="cal-cell" style={{background:bg, color:col}}>
                      {cell.d}
                      {cell.hasSlots && !cell.isBlocked && <div className="cal-dot" style={{background:'#6c63ff'}}/>}
                      {cell.isBlocked && <div className="cal-dot" style={{background:'#FF4757'}}/>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slot Summary */}
            <div className="scard">
              <div className="scard-head">
                <h3>📊 Slot Summary</h3>
              </div>
              <div className="slot-stats">
                <div className="stat-item">
                  <div className="stat-val">{slots.length}</div>
                  <div className="stat-lbl">Total Slots</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val" style={{color:'var(--success)'}}>
                    {slots.filter(s => Number(s.booked_count) < Number(s.max_capacity)).length}
                  </div>
                  <div className="stat-lbl">Available</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val" style={{color:'var(--error)'}}>
                    {slots.filter(s => Number(s.booked_count) >= Number(s.max_capacity)).length}
                  </div>
                  <div className="stat-lbl">Full</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val" style={{color:'var(--primary-light)'}}>
                    {slots.reduce((acc, s) => acc + Number(s.booked_count), 0)}
                  </div>
                  <div className="stat-lbl">Total Booked</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .schedule-page { max-width:1100px; margin:0 auto; padding:var(--space-6) var(--space-4); }
        .schedule-header { display:flex; align-items:flex-start; gap:var(--space-4); margin-bottom:var(--space-6); flex-wrap:wrap; }
        .schedule-h1 { font-size:1.6rem; font-weight:800; margin:0 0 4px; }
        .schedule-subtitle { margin:0; color:var(--text-muted); font-size:.9rem; }
        .schedule-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-5); align-items:start; }
        .schedule-left, .schedule-right { display:flex; flex-direction:column; gap:var(--space-5); }
        .scard { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--space-5); }
        .scard-head { margin-bottom:var(--space-4); }
        .scard-head h3 { margin:0 0 4px; font-size:1rem; font-weight:700; }
        .scard-sub { margin:0; font-size:.8rem; color:var(--text-muted); line-height:1.5; }
        /* Days */
        .schedule-days { display:flex; flex-direction:column; gap:var(--space-2); }
        .day-row { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-2) var(--space-3); border-radius:var(--radius-md); background:rgba(255,255,255,.03); transition:background .2s; }
        .day-row:hover { background:rgba(255,255,255,.06); }
        .day-off { opacity:.5; }
        .day-toggle { display:flex; align-items:center; gap:var(--space-2); cursor:pointer; min-width:110px; }
        .day-toggle input[type=checkbox] { width:16px; height:16px; accent-color:var(--primary); cursor:pointer; }
        .day-name { font-size:.85rem; font-weight:600; }
        .day-times { display:flex; align-items:center; gap:6px; flex:1; }
        .day-sep { color:var(--text-muted); font-size:.8rem; }
        .day-closed { font-size:.78rem; color:var(--text-muted); font-style:italic; }
        .input-sm { padding:4px 8px; font-size:.8rem; width:100px; }
        /* Blocked */
        .block-form { display:grid; grid-template-columns:1fr 1fr auto; gap:var(--space-2); margin-bottom:var(--space-3); }
        .blocked-list { display:flex; flex-direction:column; gap:var(--space-2); max-height:200px; overflow-y:auto; }
        .blocked-item { display:flex; justify-content:space-between; align-items:center; background:rgba(255,71,87,.08); border:1px solid rgba(255,71,87,.2); border-radius:var(--radius-md); padding:8px 12px; }
        .blocked-date { font-size:.85rem; font-weight:600; color:#FF4757; }
        .blocked-reason { font-size:.75rem; color:var(--text-muted); margin-top:2px; }
        /* Generate */
        .gen-form { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3); }
        /* Calendar */
        .mini-cal { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-top:var(--space-3); }
        .cal-head-cell { text-align:center; font-size:.65rem; font-weight:700; color:var(--text-muted); padding:4px 0; text-transform:uppercase; }
        .cal-cell { position:relative; aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:6px; font-size:.78rem; font-weight:600; transition:background .2s; }
        .cal-dot { width:4px; height:4px; border-radius:50%; margin-top:2px; }
        .cal-legend { display:flex; align-items:center; gap:4px; font-size:.7rem; color:var(--text-muted); margin-top:4px; flex-wrap:wrap; }
        .cal-leg-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
        /* Stats */
        .slot-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-3); }
        .stat-item { text-align:center; }
        .stat-val { font-size:1.6rem; font-weight:800; }
        .stat-lbl { font-size:.7rem; color:var(--text-muted); margin-top:2px; }
        @media(max-width:768px) {
          .schedule-grid { grid-template-columns:1fr; }
          .block-form { grid-template-columns:1fr; }
          .gen-form { grid-template-columns:1fr; }
          .slot-stats { grid-template-columns:repeat(2,1fr); }
        }
      `}</style>
    </div>
  );
}
