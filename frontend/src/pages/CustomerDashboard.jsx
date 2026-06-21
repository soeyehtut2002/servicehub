import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ReviewForm from '../components/ReviewForm';
import toast from 'react-hot-toast';
import { getCurrencyMeta, formatCurrency } from '../utils/currency';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('all');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [editReview,    setEditReview]    = useState(null); // existing review for edit
  const [cancelModal,   setCancelModal]   = useState(null);
  const [cancelReason,  setCancelReason]  = useState('');

  const fetchBookings = async () => {
    try {
      const res = await API.get('/bookings/my');
      setBookings(res.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async () => {
    if (!cancelModal) return;
    try {
      await API.patch(`/bookings/${cancelModal.id}/cancel`, { reason: cancelReason });
      toast.success('Booking cancelled');
      setCancelModal(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  // Load existing review for a booking (so user can edit)
  const openReview = async (booking) => {
    try {
      const res = await API.get(`/reviews/service/${booking.service_id}`);
      const myReview = res.data.reviews.find(r => r.customer_id === user.id);
      setEditReview(myReview || null);
      setReviewBooking(booking);
    } catch {
      setReviewBooking(booking);
    }
  };

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);
  const counts = {
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    paused:    bookings.filter(b => b.status === 'paused').length,
  };

  const canCancel = (status) => ['pending', 'confirmed', 'paused'].includes(status);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <div className="flex-between">
            <div>
              <h1 className="h2">👋 My Dashboard</h1>
              <p className="text-muted mt-2">Welcome back, {user?.name}</p>
            </div>
            <div style={{display:'flex',gap:'var(--space-3)'}}>
              <Link to="/profile" className="btn btn-ghost">👤 My Profile</Link>
              <Link to="/services" className="btn btn-primary">Browse Services</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container section-sm">
        {/* Stats */}
        <div className="grid-4 grid mb-8">
          {[
            { label:'Total Bookings', value:bookings.length,  icon:'📅', color:'#6C63FF' },
            { label:'Pending',        value:counts.pending,   icon:'⏳', color:'#FFBE0B' },
            { label:'Confirmed',      value:counts.confirmed, icon:'✅', color:'#6C63FF' },
            { label:'Completed',      value:counts.completed, icon:'🎉', color:'#00D4AA' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{background:`${s.color}22`}}>{s.icon}</div>
              <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs mb-6">
          {['all','pending','confirmed','paused','completed','cancelled'].map(t => (
            <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t === 'paused' && counts.paused > 0 && (
                <span style={{marginLeft:4,background:'#FF9800',color:'#000',borderRadius:'10px',fontSize:'.7rem',padding:'1px 6px'}}>{counts.paused}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-container"><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No {tab === 'all' ? '' : tab} bookings</h3>
            <p>Start by browsing available services</p>
            <Link to="/services" className="btn btn-primary mt-4">Browse Services</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Service</th><th>Provider</th><th>Date / Slot</th><th>Price Paid</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td data-label="Service">
                      <div style={{fontWeight:700,color:'var(--text-primary)'}}>{b.service_title}</div>
                      <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{b.category}</div>
                    </td>
                    <td data-label="Provider">
                      <Link
                        to={`/profile/${b.provider_id}`}
                        style={{fontWeight:600,color:'var(--primary)',textDecoration:'none'}}
                        title="View provider profile"
                      >
                        {b.provider_name}
                      </Link>
                    </td>
                    <td data-label="Date / Slot">
                      {b.slot_date ? (
                        <div>
                          <div style={{fontWeight:600}}>{new Date(b.slot_date+'T00:00:00').toLocaleDateString()}</div>
                          <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</div>
                        </div>
                      ) : (
                        new Date(b.booking_date).toLocaleString()
                      )}
                    </td>
                    <td data-label="Price Paid">
                      {/* Show payment currency if available, else fallback to service price */}
                      {b.converted_price && b.payment_currency ? (
                        <div>
                          <div style={{fontWeight:800,color:'var(--primary)',fontSize:'.95rem'}}>
                            {getCurrencyMeta(b.payment_currency).flag} {getCurrencyMeta(b.payment_currency).symbol}{parseFloat(b.converted_price).toLocaleString('en-US',{maximumFractionDigits:b.payment_currency==='USD'?2:0})} <span style={{fontSize:'.75em',fontWeight:600}}>{b.payment_currency}</span>
                          </div>
                          <div style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:2}}>
                            {getCurrencyMeta(b.currency||'USD').flag} {formatCurrency(parseFloat(b.price), b.currency||'USD')} original
                          </div>
                          {b.exchange_rate && b.payment_currency !== (b.currency||'USD') && (
                            <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>rate: {parseFloat(b.exchange_rate).toFixed(4)}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{color:'var(--success)',fontWeight:700}}>
                          {getCurrencyMeta(b.currency||'USD').symbol}{parseFloat(b.price).toFixed(2)} {b.currency||'USD'}
                        </span>
                      )}
                    </td>
                    <td data-label="Status"><StatusBadge status={b.status}/></td>
                    <td data-label="Actions">
                      <div style={{display:'flex',gap:'var(--space-2)',flexWrap:'wrap'}}>
                        <Link to={`/services/${b.service_id}`} className="btn btn-ghost btn-sm">View</Link>
                        {canCancel(b.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCancelModal(b)}>Cancel</button>
                        )}
                        {b.status === 'completed' && (
                          <button className="btn btn-outline btn-sm" onClick={() => openReview(b)}>
                            {editReview ? 'Edit Review' : 'Review'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Cancel Reason Modal ─────────────────────────────────────────── */}
        {cancelModal && (
          <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setCancelModal(null)}>
            <div className="modal-content" style={{maxWidth:400}}>
              <div className="modal-header">
                <h3 className="modal-title">Cancel Booking</h3>
                <button className="modal-close" onClick={() => setCancelModal(null)}>✕</button>
              </div>
              <p style={{color:'var(--text-secondary)',marginBottom:'var(--space-4)'}}>
                Are you sure you want to cancel <strong>{cancelModal.service_title}</strong>?
              </p>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea
                  className="textarea" rows={2}
                  placeholder="Let the provider know why you're cancelling..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                />
              </div>
              <div style={{display:'flex',gap:'var(--space-3)',justifyContent:'flex-end',marginTop:'var(--space-4)'}}>
                <button className="btn btn-ghost" onClick={() => setCancelModal(null)}>Keep Booking</button>
                <button className="btn btn-danger" onClick={handleCancel}>Yes, Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Review Modal ────────────────────────────────────────────────── */}
        {reviewBooking && (
          <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setReviewBooking(null)}>
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editReview ? '✏️ Edit Review' : '⭐ Review'}: {reviewBooking.service_title}
                </h3>
                <button className="modal-close" onClick={() => setReviewBooking(null)}>✕</button>
              </div>
              <ReviewForm
                serviceId={reviewBooking.service_id}
                bookingId={reviewBooking.id}
                existingReview={editReview}
                onReviewSubmitted={() => {
                  setReviewBooking(null);
                  setEditReview(null);
                  toast.success(editReview ? 'Review updated!' : 'Review submitted!');
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
