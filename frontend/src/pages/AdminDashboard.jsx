import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { getCurrencyMeta, formatCurrency, formatAllCurrencies } from '../utils/currency';
import { resolveUploadUrl } from '../config';
import { BarChart2, Users, Wrench, Calendar, Star, MessageSquare, Eye, Lock, Unlock, Trash2, Flag, X, Package, MapPin, FileText, Clock, Tag, ShieldCheck, User, CheckCheck, Megaphone } from 'lucide-react';

const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  // Chats
  const [conversations, setConversations] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const threadEndRef = useRef(null);
  // Booking chat modal
  const [bookingChat, setBookingChat] = useState(null); // { booking, messages, loading }

  // Ads state
  const [ads, setAds] = useState([]);
  const [editingAd, setEditingAd] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    image_url: '',
    logo_url: '',
    cta_text: 'Learn More',
    cta_url: '',
    is_active: true,
    start_date: '',
    end_date: '',
  });

  const fetchStats = async () => { try { const r = await API.get('/admin/stats'); setStats(r.data); } catch { toast.error('Failed to load stats'); } };
  const fetchUsers = async () => { try { const r = await API.get('/admin/users'); setUsers(r.data); } catch { toast.error('Failed to load users'); } };
  const fetchServices = async () => { try { const r = await API.get('/admin/services'); setServices(r.data); } catch { toast.error('Failed to load services'); } };
  const fetchBookings = async () => { try { const r = await API.get('/admin/bookings'); setBookings(r.data); } catch { toast.error('Failed to load bookings'); } };
  const fetchReviews = async () => { try { const r = await API.get('/admin/reviews'); setReviews(r.data); } catch { toast.error('Failed to load reviews'); } };
  const fetchChats = async () => { try { const r = await API.get('/admin/chats'); setConversations(r.data); } catch { toast.error('Failed to load conversations'); } };
  const fetchAds = async () => { try { const r = await API.get('/ads'); setAds(r.data); } catch { toast.error('Failed to load advertisements'); } };

  const handleToggleAd = async (id) => {
    try {
      await API.patch(`/ads/${id}/toggle`);
      toast.success('Advertisement status updated');
      fetchAds();
    } catch {
      toast.error('Failed to update advertisement status');
    }
  };

  const handleDeleteAd = async (id) => {
    if (!confirm('Permanently delete this advertisement?')) return;
    try {
      await API.delete(`/ads/${id}`);
      toast.success('Advertisement deleted');
      fetchAds();
    } catch {
      toast.error('Failed to delete advertisement');
    }
  };

  const handleOpenCreateAd = () => {
    setEditingAd(null);
    setAdForm({
      title: '',
      description: '',
      image_url: '',
      logo_url: '',
      cta_text: 'Learn More',
      cta_url: '',
      is_active: true,
      start_date: '',
      end_date: '',
    });
    setShowAdModal(true);
  };

  const handleOpenEditAd = (ad) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title || '',
      description: ad.description || '',
      image_url: ad.image_url || '',
      logo_url: ad.logo_url || '',
      cta_text: ad.cta_text || 'Learn More',
      cta_url: ad.cta_url || '',
      is_active: ad.is_active !== undefined ? ad.is_active : true,
      start_date: ad.start_date ? new Date(ad.start_date).toISOString().slice(0, 16) : '',
      end_date: ad.end_date ? new Date(ad.end_date).toISOString().slice(0, 16) : '',
    });
    setShowAdModal(true);
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    if (!adForm.title || !adForm.image_url) {
      toast.error('Title and Image URL are required');
      return;
    }
    try {
      const data = {
        ...adForm,
        start_date: adForm.start_date ? new Date(adForm.start_date).toISOString() : null,
        end_date: adForm.end_date ? new Date(adForm.end_date).toISOString() : null,
      };
      if (editingAd) {
        await API.put(`/ads/${editingAd.id}`, data);
        toast.success('Advertisement updated successfully');
      } else {
        await API.post('/ads', data);
        toast.success('Advertisement created successfully');
      }
      setShowAdModal(false);
      fetchAds();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save advertisement');
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const loadingToast = toast.loading('Uploading image...');
    try {
      const res = await API.post('/ads/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAdForm(prev => ({ ...prev, [field]: res.data.url }));
      toast.success('Uploaded successfully', { id: loadingToast });
    } catch (err) {
      toast.error('Upload failed', { id: loadingToast });
    }
  };

  const openThread = async (conv) => {
    setActiveThread(conv);
    setThreadLoading(true);
    setThreadMessages([]);
    try {
      const r = await API.get(`/admin/chats/${conv.user_a_id}/${conv.user_b_id}`);
      setThreadMessages(r.data);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to load messages'); }
    finally { setThreadLoading(false); }
  };

  const openBookingChat = async (booking) => {
    setBookingChat({ booking, messages: [], loading: true });
    try {
      const r = await API.get(`/admin/chats/${booking.customer_id}/${booking.provider_id}`);
      setBookingChat({ booking, messages: r.data, loading: false });
    } catch {
      toast.error('Failed to load chat');
      setBookingChat(null);
    }
  };

  useEffect(() => { const load = async () => { setLoading(true); await fetchStats(); setLoading(false); }; load(); }, []);
  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'services') fetchServices();
    if (tab === 'bookings') fetchBookings();
    if (tab === 'reviews') fetchReviews();
    if (tab === 'chats') fetchChats();
    if (tab === 'ads') fetchAds();
  }, [tab]);

  const handleToggleUser = async (id) => {
    try { await API.patch(`/admin/users/${id}/status`); toast.success('User status updated'); fetchUsers(); }
    catch { toast.error('Failed to update user'); }
  };
  const handleDeleteUser = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try { await API.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchUsers(); }
    catch { toast.error('Failed to delete user'); }
  };
  const handleDeleteService = async (id) => {
    if (!confirm('Delete this service?')) return;
    try { await API.delete(`/admin/services/${id}`); toast.success('Service deleted'); fetchServices(); }
    catch { toast.error('Failed to delete service'); }
  };
  const handleDeleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try { await API.delete(`/admin/reviews/${id}`); toast.success('Review deleted'); fetchReviews(); }
    catch { toast.error('Failed to delete review'); }
  };
  const handleFlagReview = async (id) => {
    try {
      const r = await API.patch(`/admin/reviews/${id}/flag`);
      toast.success(r.data.is_flagged ? 'Review flagged' : 'Flag removed');
      fetchReviews();
    } catch { toast.error('Failed to flag review'); }
  };
  const handleAdminCancel = async (id) => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Cancel in prompt
    try {
      await API.patch(`/bookings/${id}/admin-cancel`, { reason: reason || 'Cancelled by administrator' });
      toast.success('Booking cancelled by admin');
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to cancel booking'); }
  };

  const ROLE_COLORS = { admin: '#00FFFF', provider: '#00D4AA', customer: '#FFBE0B' };
  const categories = [...new Set(services.map(s => s.category))].sort();
  const filteredServices = categoryFilter ? services.filter(s => s.category === categoryFilter) : services;

  const filteredConversations = conversations.filter(c =>
    c.user_a_name.toLowerCase().includes(chatSearch.toLowerCase()) ||
    c.user_b_name.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const TABS = [
    { key: 'overview', Icon: BarChart2,     label: 'Overview' },
    { key: 'users',    Icon: Users,         label: 'Users' },
    { key: 'services', Icon: Wrench,        label: 'Services' },
    { key: 'bookings', Icon: Calendar,      label: 'Bookings' },
    { key: 'reviews',  Icon: Star,          label: 'Reviews' },
    { key: 'chats',    Icon: MessageSquare, label: 'Chats' },
    { key: 'ads',      Icon: Megaphone,     label: 'Ads' },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1 className="h2"> Admin Dashboard</h1>
          <p className="text-muted mt-2">Platform management &amp; analytics</p>
        </div>
      </div>

      <div className="container section-sm">
        {/* Tabs */}
        <div className="tabs mb-8" style={{ maxWidth: 680 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <t.Icon size={14} strokeWidth={2}/>{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-container"><div className="spinner" /></div>
        ) : (
          <>
            {/* ── Overview ─────────────────────────────────────── */}
            {tab === 'overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                <div className="grid-4 grid">
                  {[
                    { label: 'Total Users',     value: stats.totals.users,    Icon: Users,    color: '#00FFFF' },
                    { label: 'Active Services', value: stats.totals.services, Icon: Wrench,   color: '#00D4AA' },
                    { label: 'Total Bookings',  value: stats.totals.bookings, Icon: Calendar, color: '#0080FF' },
                    { label: 'Total Reviews',   value: stats.totals.reviews,  Icon: Star,     color: '#FFBE0B' },
                  ].map(s => (
                    <div key={s.label} className="stat-card aqua-glow" style={{ borderColor: `${s.color}30` }}>
                      <div className="stat-icon" style={{ background: `${s.color}18` }}><s.Icon size={24} color={s.color} strokeWidth={1.8}/></div>
                      <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
                    </div>
                  ))}
                </div>

                <div className="admin-charts-grid">
                  {/* Bookings by Status */}
                  <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-5)', color: 'var(--primary)', display:'flex', alignItems:'center', gap:7 }}><BarChart2 size={15} strokeWidth={2}/>Bookings by Status</h3>
                    {stats.bookingsByStatus.map(s => {
                      const total = stats.totals.bookings || 1;
                      const pct = Math.round((parseInt(s.count) / total) * 100);
                      const colors = { pending: '#FFBE0B', confirmed: '#00FFFF', completed: '#00D4AA', cancelled: '#FF4757' };
                      return (
                        <div key={s.status} style={{ marginBottom: 'var(--space-4)' }}>
                          <div className="flex-between mb-2">
                            <span style={{ fontSize: '.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{s.status}</span>
                            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{s.count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(0,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: colors[s.status] || '#00FFFF', borderRadius: 4, transition: 'width .5s ease', boxShadow: `0 0 8px ${colors[s.status] || '#00FFFF'}60` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Categories */}
                  <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-5)', color: 'var(--primary)', display:'flex', alignItems:'center', gap:7 }}><Tag size={15} strokeWidth={2}/>Services by Category</h3>
                    {stats.categoryStats.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No services yet</p>
                    ) : stats.categoryStats.map((c, i) => (
                      <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.categoryStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <button
                          onClick={() => { setTab('services'); setCategoryFilter(c.category); }}
                          style={{ fontSize: '.875rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                        >{c.category}</button>
                        <span className="badge badge-primary">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Bookings */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--primary)', display:'flex', alignItems:'center', gap:7 }}><Clock size={15} strokeWidth={2}/>Recent Bookings</h3>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {stats.recentBookings.map(b => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 600 }}>{b.customer_name}</td>
                            <td>{b.service_title}</td>
                            <td>{new Date(b.booking_date).toLocaleDateString()}</td>
                            <td><StatusBadge status={b.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Users ────────────────────────────────────────── */}
            {tab === 'users' && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: '.75rem', background: 'var(--gradient-primary)' }}>{u.name[0]?.toUpperCase()}</div>
                            <Link
                              to={`/profile/${u.id}`}
                              style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                              title="View profile"
                            >
                              {u.name}
                            </Link>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td><span className="badge" style={{ background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44` }}>{u.role}</span></td>
                        <td>{u.location || '—'}</td>
                        <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? '● Active' : '● Inactive'}</span></td>
                        <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <Link to={`/profile/${u.id}`} className="btn btn-ghost btn-sm" title="View full profile" style={{display:'inline-flex',alignItems:'center',gap:4}}><Eye size={13} strokeWidth={2}/></Link>
                            <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleUser(u.id)}>
                              {u.is_active ? <><Lock size={12} strokeWidth={2}/>Deactivate</> : <><Unlock size={12} strokeWidth={2}/>Activate</>}
                            </button>
                            {u.role !== 'admin' && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)} style={{display:'inline-flex',alignItems:'center'}}><Trash2 size={13} strokeWidth={2}/></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Services ─────────────────────────────────────── */}
            {tab === 'services' && (
              <div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
                  <button className={`btn btn-sm ${!categoryFilter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCategoryFilter('')}>All</button>
                  {categories.map(c => (
                    <button key={c} className={`btn btn-sm ${categoryFilter === c ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCategoryFilter(c)}>{c}</button>
                  ))}
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Service</th><th>Provider</th><th>Category</th><th>Price</th><th>Rating</th><th>Bookings</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredServices.map(s => {
                        const nativeCur = s.currency || 'USD';
                        const nativeMeta = getCurrencyMeta(nativeCur);
                        const altCur = nativeCur === 'THB' ? 'USD' : 'THB';
                        const altFormatted = formatAllCurrencies(s.price, nativeCur);
                        return (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.location}</div>
                            </td>
                            <td>{s.provider_name}</td>
                            <td><span className="badge badge-primary">{s.category}</span></td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {nativeMeta.symbol}{parseFloat(s.price).toLocaleString('en-US', { maximumFractionDigits: nativeCur === 'USD' ? 2 : 0 })}
                                <span style={{ fontSize: '.72em', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 3 }}>{nativeCur}</span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                ≈ {altFormatted[altCur.toLowerCase()]} {altCur}
                              </div>
                            </td>
                            <td style={{display:'flex',alignItems:'center',gap:4}}><Star size={12} strokeWidth={2} fill="#F59E0B" color="#F59E0B"/>{parseFloat(s.avg_rating || 0).toFixed(1)} <span style={{color:'var(--text-muted)'}}>({s.review_count})</span></td>
                            <td>{s.booking_count}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <Link to={`/services/${s.id}`} className="btn btn-ghost btn-sm">View</Link>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteService(s.id)} style={{display:'inline-flex',alignItems:'center'}}><Trash2 size={13} strokeWidth={2}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Bookings ─────────────────────────────────────── */}
            {tab === 'bookings' && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Customer</th><th>Service</th><th>Provider</th><th>Date</th><th>Price</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bookings.map(b => {
                      const nativeCur = b.currency || 'USD';
                      const nativeMeta = getCurrencyMeta(nativeCur);
                      return (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.customer_name}</td>
                          <td>{b.service_title}</td>
                          <td>{b.provider_name}</td>
                          <td>{new Date(b.booking_date).toLocaleDateString()}</td>
                          <td>
                            <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
                              {nativeMeta.symbol}{parseFloat(b.price).toLocaleString('en-US', { maximumFractionDigits: nativeCur === 'USD' ? 2 : 0 })}
                              <span style={{ fontSize: '.72em', color: 'var(--text-muted)', marginLeft: 3 }}>{nativeCur}</span>
                            </div>
                            {b.converted_price && b.payment_currency && b.payment_currency !== nativeCur && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                paid: {getCurrencyMeta(b.payment_currency).symbol}
                                {parseFloat(b.converted_price).toLocaleString('en-US', { maximumFractionDigits: b.payment_currency === 'USD' ? 2 : 0 })}
                                {' '}{b.payment_currency}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '.8rem', color: 'var(--text-secondary)', maxWidth: 140 }}>{b.location || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openBookingChat(b)} title="View chat" style={{display:'inline-flex',alignItems:'center',gap:4}}><MessageSquare size={13} strokeWidth={2}/>Chat</button>
                              {!['cancelled', 'completed'].includes(b.status) && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleAdminCancel(b.id)} title="Admin cancel" style={{display:'inline-flex',alignItems:'center',gap:4}}><X size={13} strokeWidth={2.5}/>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Reviews ──────────────────────────────────────── */}
            {tab === 'reviews' && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Customer</th><th>Service</th><th>Rating</th><th>Comment</th><th>Flagged</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.id} style={{ background: r.is_flagged ? 'rgba(255,71,87,0.05)' : undefined }}>
                        <td style={{ fontWeight: 600 }}>{r.customer_name}</td>
                        <td>
                          <Link to={`/services/${r.service_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                            {r.service_title}
                          </Link>
                        </td>
                        <td>{Array.from({length:r.rating},(_,i)=><Star key={i} size={12} strokeWidth={2} fill="#F59E0B" color="#F59E0B"/>)} <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>({r.rating}/5)</span></td>
                        <td style={{ maxWidth: 200, fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                          {r.comment ? <span className="truncate" style={{ display: 'block', maxWidth: 180 }}>{r.comment}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          {r.is_flagged
                            ? <span className="badge badge-danger" style={{display:'inline-flex',alignItems:'center',gap:4}}><Flag size={11} strokeWidth={2}/>Flagged</span>
                            : <span className="badge badge-muted">Clear</span>}
                        </td>
                        <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                              className={`btn btn-sm ${r.is_flagged ? 'btn-ghost' : 'btn-outline'}`}
                              onClick={() => handleFlagReview(r.id)}
                              title={r.is_flagged ? 'Remove flag' : 'Flag review'}
                             style={{display:'inline-flex',alignItems:'center',gap:4}}>{r.is_flagged ? <><Flag size={12} strokeWidth={2}/>Unflag</> : <><Flag size={12} strokeWidth={2} fill="currentColor"/>Flag</>}</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReview(r.id)} style={{display:'inline-flex',alignItems:'center'}}><Trash2 size={13} strokeWidth={2}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reviews.length === 0 && <div className="empty-state"><div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><Star size={40} strokeWidth={1.5}/></div><p>No reviews yet</p></div>}
              </div>
            )}
            {tab === 'chats' && (
              <div className="adm-chat-layout">
                {/* Left: conversation list */}
                <div className="adm-chat-sidebar">
                  <div className="adm-chat-sidebar-header">
                    <h3 style={{display:'flex',alignItems:'center',gap:6}}><MessageSquare size={15} strokeWidth={2}/>All Conversations</h3>
                    <span className="badge badge-primary">{conversations.length}</span>
                  </div>
                  <input
                    className="input adm-chat-search"
                    placeholder="Search by name..."
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                  />
                  <div className="adm-conv-list">
                    {filteredConversations.length === 0 ? (
                      <div className="adm-conv-empty">No conversations found</div>
                    ) : filteredConversations.map((conv, i) => {
                      const isActive = activeThread &&
                        activeThread.user_a_id === conv.user_a_id &&
                        activeThread.user_b_id === conv.user_b_id;
                      return (
                        <button
                          key={i}
                          className={`adm-conv-item${isActive ? ' active' : ''}`}
                          onClick={() => openThread(conv)}
                        >
                          <div className="adm-conv-avatars">
                            <div className="adm-conv-av" style={{ background: `${ROLE_COLORS[conv.user_a_role]}30`, color: ROLE_COLORS[conv.user_a_role] }}>
                              {conv.user_a_name[0]?.toUpperCase()}
                            </div>
                            <div className="adm-conv-av" style={{ background: `${ROLE_COLORS[conv.user_b_role]}30`, color: ROLE_COLORS[conv.user_b_role], marginLeft: -8 }}>
                              {conv.user_b_name[0]?.toUpperCase()}
                            </div>
                          </div>
                          <div className="adm-conv-info">
                            <div className="adm-conv-names">
                              <span>{conv.user_a_name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '.75em' }}> &amp; </span>
                              <span>{conv.user_b_name}</span>
                            </div>
                            <div className="adm-conv-roles">
                              <span className="adm-role-badge" style={{ color: ROLE_COLORS[conv.user_a_role] }}>{conv.user_a_role}</span>
                              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>↔</span>
                              <span className="adm-role-badge" style={{ color: ROLE_COLORS[conv.user_b_role] }}>{conv.user_b_role}</span>
                            </div>
                            <div className="adm-conv-preview">
                              {conv.last_message ? `"${conv.last_message.slice(0, 42)}${conv.last_message.length > 42 ? '…' : ''}"` : 'No messages'}
                            </div>
                          </div>
                          <div className="adm-conv-meta">
                            <span className="adm-conv-count">{conv.message_count} msgs</span>
                            <span className="adm-conv-time">
                              {new Date(conv.last_message_at).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: thread viewer */}
                <div className="adm-chat-thread">
                  {!activeThread ? (
                    <div className="adm-thread-empty">
                      <div style={{ display:'flex',justifyContent:'center',opacity:0.4 }}><MessageSquare size={48} strokeWidth={1.5}/></div>
                      <p>Select a conversation to view messages</p>
                    </div>
                  ) : (
                    <>
                      <div className="adm-thread-header">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                            {activeThread.user_a_name}
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, margin: '0 8px' }}>↔</span>
                            {activeThread.user_b_name}
                          </div>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span style={{ color: ROLE_COLORS[activeThread.user_a_role] }}>{activeThread.user_a_role}</span>
                            {' '}↔{' '}
                            <span style={{ color: ROLE_COLORS[activeThread.user_b_role] }}>{activeThread.user_b_role}</span>
                            {' · '}{threadMessages.length} messages
                          </div>
                        </div>
                        <span className="badge badge-muted" style={{display:'inline-flex',alignItems:'center',gap:4}}><Lock size={11} strokeWidth={2}/>Read-only</span>
                      </div>

                      <div className="adm-thread-messages">
                        {threadLoading ? (
                          <div className="spinner-container" style={{ minHeight: 200 }}><div className="spinner" /></div>
                        ) : threadMessages.length === 0 ? (
                          <div className="adm-thread-empty"><p>No messages in this conversation</p></div>
                        ) : (
                          threadMessages.map((msg) => {
                            const isA = msg.sender_id === activeThread.user_a_id;
                            const roleColor = ROLE_COLORS[msg.sender_role] || '#ccc';
                            return (
                              <div key={msg.id} className={`adm-msg-row ${isA ? 'row-left' : 'row-right'}`}>
                                <div className="adm-msg-av" style={{ background: `${roleColor}25`, color: roleColor }}>
                                  {msg.sender_name[0]?.toUpperCase()}
                                </div>
                                <div className="adm-msg-body">
                                  <div className="adm-msg-meta">
                                    <span style={{ color: roleColor, fontWeight: 700 }}>{msg.sender_name}</span>
                                    <span className="adm-msg-role">{msg.sender_role}</span>
                                    <span className="adm-msg-time">
                                      {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                    {msg.is_read && <span className="adm-msg-read">Read</span>}
                                  </div>
                                  <div className="adm-msg-bubble" style={{ borderColor: `${roleColor}40` }}>
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={threadEndRef} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Ads ──────────────────────────────────────────── */}
            {tab === 'ads' && (
              <div>
                <div className="ads-header-row">
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Megaphone size={20} color="var(--primary)" /> Advertisement Banners
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage compact home screen popups and scheduling</p>
                  </div>
                  <button className="btn btn-primary" onClick={handleOpenCreateAd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    + Create Ad
                  </button>
                </div>

                {ads.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', opacity: 0.4 }}>
                      <Megaphone size={40} strokeWidth={1.5} />
                    </div>
                    <p>No advertisements created yet</p>
                  </div>
                ) : (
                  <div className="ads-card-grid">
                    {ads.map(ad => {
                      const now = new Date();
                      const started = !ad.start_date || new Date(ad.start_date) <= now;
                      const ended = ad.end_date && new Date(ad.end_date) < now;

                      let statusText = 'Inactive';
                      let statusClass = 'badge-danger';
                      if (ad.is_active) {
                        if (ended) { statusText = 'Expired'; statusClass = 'badge-muted'; }
                        else if (!started) { statusText = 'Scheduled'; statusClass = 'badge-primary'; }
                        else { statusText = 'Active'; statusClass = 'badge-success'; }
                      }

                      return (
                        <div key={ad.id} className="ad-admin-card">
                          {/* Banner Image */}
                          <div className="ad-admin-img-wrap">
                            <img
                              src={resolveUploadUrl(ad.image_url)}
                              alt={ad.title}
                              className="ad-admin-img"
                            />
                            <span className={`badge ${statusClass} ad-admin-status-badge`}>{statusText}</span>
                          </div>

                          {/* Card Body */}
                          <div className="ad-admin-body">
                            <div className="ad-admin-meta">
                              {ad.logo_url ? (
                                <img src={resolveUploadUrl(ad.logo_url)} alt="" className="ad-admin-logo" />
                              ) : (
                                <div className="ad-admin-logo-placeholder"><Megaphone size={14} /></div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'Now'} →{' '}
                                  {ad.end_date ? new Date(ad.end_date).toLocaleDateString() : '∞'}
                                </div>
                              </div>
                            </div>

                            {ad.description && (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.4,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {ad.description}
                              </p>
                            )}

                            <div className="ad-admin-actions">
                              <button
                                className={`btn btn-sm ${ad.is_active ? 'btn-success' : 'btn-outline'}`}
                                onClick={() => handleToggleAd(ad.id)}
                                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                              >
                                {ad.is_active ? '● Active' : '○ Inactive'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditAd(ad)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAd(ad.id)} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>

      {/* ── Booking Chat Modal ─────────────────────────────────────────────── */}
      {bookingChat && (
        <div className="bcm-overlay" onClick={() => setBookingChat(null)}>
          <div className="bcm-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bcm-header">
              <div className="bcm-header-left">
                <span className="bcm-icon" style={{display:'flex',alignItems:'center'}}><MessageSquare size={22} strokeWidth={1.8}/></span>
                <div>
                  <div className="bcm-title">Booking Chat — {bookingChat.booking.service_title}</div>
                  <div className="bcm-subtitle">
                    <span style={{ color: ROLE_COLORS.customer, display:'inline-flex', alignItems:'center', gap:4 }}><User size={13} strokeWidth={2}/>{bookingChat.booking.customer_name}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>↔</span>
                    <span style={{ color: ROLE_COLORS.provider, display:'inline-flex', alignItems:'center', gap:4 }}><Wrench size={13} strokeWidth={2}/>{bookingChat.booking.provider_name}</span>
                    <span className="bcm-dot">·</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(bookingChat.booking.booking_date).toLocaleDateString()}</span>
                    <span className="bcm-dot">·</span>
                    <StatusBadge status={bookingChat.booking.status} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="badge badge-muted" style={{display:'inline-flex',alignItems:'center',gap:4}}><Lock size={11} strokeWidth={2}/>Read-only</span>
                <button className="bcm-close" onClick={() => setBookingChat(null)}><X size={16} strokeWidth={2.5}/></button>
              </div>
            </div>

            {/* Info bar */}
            <div className="bcm-info-bar">
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Package size={13} strokeWidth={2}/>Booking #{bookingChat.booking.id}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><MapPin size={13} strokeWidth={2}/>{bookingChat.booking.location || 'No location'}</span>
              {bookingChat.booking.notes && <span style={{display:'inline-flex',alignItems:'center',gap:4}}><FileText size={13} strokeWidth={2}/>{bookingChat.booking.notes}</span>}
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><MessageSquare size={13} strokeWidth={2}/>{bookingChat.messages.length} messages</span>
            </div>

            {/* Messages */}
            <div className="bcm-messages">
              {bookingChat.loading ? (
                <div className="spinner-container" style={{ minHeight: 200 }}><div className="spinner" /></div>
              ) : bookingChat.messages.length === 0 ? (
                <div className="bcm-no-msgs">
                  <div style={{ display:'flex',justifyContent:'center',opacity:0.4 }}><MessageSquare size={36} strokeWidth={1.5}/></div>
                  <p>No messages between these users yet.</p>
                  <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>They may not have communicated through the platform chat.</p>
                </div>
              ) : (
                bookingChat.messages.map(msg => {
                  const isCustomer = msg.sender_id === bookingChat.booking.customer_id;
                  const roleColor = isCustomer ? ROLE_COLORS.customer : ROLE_COLORS.provider;
                  return (
                    <div key={msg.id} className={`adm-msg-row ${isCustomer ? 'row-left' : 'row-right'}`}>
                      <div className="adm-msg-av" style={{ background: `${roleColor}22`, color: roleColor }}>
                        {msg.sender_name[0]?.toUpperCase()}
                      </div>
                      <div className="adm-msg-body">
                        <div className="adm-msg-meta">
                          <span style={{ color: roleColor, fontWeight: 700 }}>{msg.sender_name}</span>
                          <span className="adm-msg-role">{msg.sender_role}</span>
                          <span className="adm-msg-time">{new Date(msg.created_at).toLocaleString()}</span>
                          {msg.is_read && <span className="adm-msg-read">Read</span>}
                        </div>
                        <div className="adm-msg-bubble" style={{ borderColor: `${roleColor}40` }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Advertisement Modal ─────────────────────────────────────────────── */}
      {showAdModal && (
        <div className="bcm-overlay" onClick={() => setShowAdModal(false)}>
          <div className="bcm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {/* Header */}
            <div className="bcm-header">
              <div className="bcm-header-left">
                <span className="bcm-icon" style={{ display: 'flex', alignItems: 'center' }}><Megaphone size={22} strokeWidth={1.8} /></span>
                <div>
                  <div className="bcm-title">{editingAd ? 'Edit Advertisement' : 'Create Advertisement'}</div>
                  <div className="bcm-subtitle" style={{ color: 'var(--text-muted)' }}>
                    {editingAd ? 'Modify existing campaign banner properties' : 'Configure a new promotional campaign banner'}
                  </div>
                </div>
              </div>
              <button className="bcm-close" onClick={() => setShowAdModal(false)}><X size={16} strokeWidth={2.5} /></button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
              <form onSubmit={handleAdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Campaign Title *</label>
                  <input
                    className="input"
                    value={adForm.title}
                    onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                    placeholder="e.g. 50% Off Plumbing Services"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Short Description</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={adForm.description}
                    onChange={e => setAdForm({ ...adForm, description: e.target.value })}
                    placeholder="Brief details about the promotion..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Banner Image URL & File Upload */}
                <div className="form-group">
                  <label className="form-label">Banner Image (Cover) *</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input
                      className="input"
                      value={adForm.image_url}
                      onChange={e => setAdForm({ ...adForm, image_url: e.target.value })}
                      placeholder="/uploads/banner.jpg or https://..."
                      required
                      style={{ flex: 1 }}
                    />
                    <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0, padding: '7px 14px' }}>
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleFileUpload(e, 'image_url')}
                      />
                    </label>
                  </div>
                </div>

                {/* Company Logo URL & File Upload */}
                <div className="form-group">
                  <label className="form-label">Company Logo (Optional)</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input
                      className="input"
                      value={adForm.logo_url}
                      onChange={e => setAdForm({ ...adForm, logo_url: e.target.value })}
                      placeholder="/uploads/logo.jpg or https://..."
                      style={{ flex: 1 }}
                    />
                    <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0, padding: '7px 14px' }}>
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleFileUpload(e, 'logo_url')}
                      />
                    </label>
                  </div>
                </div>

                {/* Row for CTA Text & URL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">CTA Button Text</label>
                    <input
                      className="input"
                      value={adForm.cta_text}
                      onChange={e => setAdForm({ ...adForm, cta_text: e.target.value })}
                      placeholder="e.g. Learn More"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTA Link / Route</label>
                    <input
                      className="input"
                      value={adForm.cta_url}
                      onChange={e => setAdForm({ ...adForm, cta_url: e.target.value })}
                      placeholder="e.g. /services/5 or http://..."
                    />
                  </div>
                </div>

                {/* Scheduling: Start & End Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date (Optional)</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={adForm.start_date}
                      onChange={e => setAdForm({ ...adForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date (Optional)</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={adForm.end_date}
                      onChange={e => setAdForm({ ...adForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Is Active Checkbox */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="ad-is-active"
                    checked={adForm.is_active}
                    onChange={e => setAdForm({ ...adForm, is_active: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="ad-is-active" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Publish immediately (Is Active)
                  </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAdModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingAd ? 'Update Ad' : 'Create Ad'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Admin Chat Layout ────────────────────────────────────── */
        .adm-chat-layout { display:grid; grid-template-columns:340px 1fr; gap:var(--space-4); height:680px; }
        /* ... rest of admin chat CSS ... */
        .adm-chat-sidebar { display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; }
        .adm-chat-sidebar-header { display:flex; align-items:center; justify-content:space-between; padding:var(--space-4); border-bottom:1px solid var(--border); }
        .adm-chat-sidebar-header h3 { font-size:.95rem; font-weight:700; margin:0; }
        .adm-chat-search { border-radius:0; border-left:none; border-right:none; border-top:none; }
        .adm-conv-list { flex:1; overflow-y:auto; }
        .adm-conv-empty { padding:var(--space-6); text-align:center; color:var(--text-muted); font-size:.85rem; }
        .adm-conv-item { width:100%; display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4); border:none; background:transparent; cursor:pointer; text-align:left; border-bottom:1px solid var(--border); transition:var(--transition); }
        .adm-conv-item:hover { background:rgba(14,165,233,.06); }
        .adm-conv-item.active { background:rgba(108,99,255,.10); border-left:3px solid var(--primary); }
        .adm-conv-avatars { display:flex; flex-shrink:0; }
        .adm-conv-av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.78rem; border:2px solid var(--bg-card); }
        .adm-conv-info { flex:1; min-width:0; }
        .adm-conv-names { font-size:.82rem; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .adm-conv-roles { display:flex; align-items:center; margin-top:1px; }
        .adm-role-badge { font-size:.68rem; font-weight:700; text-transform:uppercase; }
        .adm-conv-preview { font-size:.72rem; color:var(--text-muted); font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
        .adm-conv-meta { display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; }
        .adm-conv-count { font-size:.68rem; background:rgba(108,99,255,.12); color:var(--primary); border-radius:10px; padding:1px 6px; font-weight:700; }
        .adm-conv-time { font-size:.65rem; color:var(--text-muted); }
        .adm-chat-thread { display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; }
        .adm-thread-header { padding:var(--space-4) var(--space-5); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; background:rgba(108,99,255,.04); }
        .adm-thread-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:var(--space-3); color:var(--text-muted); }
        .adm-thread-messages { flex:1; overflow-y:auto; padding:var(--space-5); display:flex; flex-direction:column; gap:var(--space-4); }
        .adm-msg-row { display:flex; gap:var(--space-3); align-items:flex-start; }
        .adm-msg-row.row-right { flex-direction:row-reverse; }
        .adm-msg-av { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.8rem; flex-shrink:0; }
        .adm-msg-body { display:flex; flex-direction:column; gap:4px; max-width:72%; }
        .row-right .adm-msg-body { align-items:flex-end; }
        .adm-msg-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .row-right .adm-msg-meta { flex-direction:row-reverse; }
        .adm-msg-role { font-size:.65rem; text-transform:uppercase; color:var(--text-muted); background:rgba(255,255,255,.06); border:1px solid var(--border); border-radius:4px; padding:1px 4px; }
        .adm-msg-time { font-size:.68rem; color:var(--text-muted); }
        .adm-msg-read { font-size:.65rem; color:var(--success); }
        .adm-msg-bubble { background:rgba(255,255,255,.06); border:1px solid; border-radius:var(--radius-lg); padding:var(--space-3) var(--space-4); font-size:.875rem; line-height:1.5; word-break:break-word; }
        .row-right .adm-msg-bubble { background:rgba(108,99,255,.12); }
        /* Responsive admin charts */
        .admin-charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-6); }
        @media(max-width:768px) {
          .adm-chat-layout { grid-template-columns:1fr; height:auto; }
          .adm-chat-thread { min-height:400px; }
          .admin-charts-grid { grid-template-columns:1fr; }
        }
        @media(max-width:600px) {
          .adm-chat-layout { height:auto; }
        }
        /* ── Booking Chat Modal ───────────────────────────── */
        .bcm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:var(--space-4); animation:fadeIn .2s ease; }
        .bcm-modal { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); width:100%; max-width:760px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(0,0,0,.5); animation:slideUp .25s ease; overflow:hidden; }
        .bcm-header { display:flex; align-items:flex-start; justify-content:space-between; padding:var(--space-5) var(--space-6); border-bottom:1px solid var(--border); background:rgba(108,99,255,.06); flex-shrink:0; gap:var(--space-4); }
        .bcm-header-left { display:flex; align-items:flex-start; gap:var(--space-4); }
        .bcm-icon { font-size:1.6rem; line-height:1; margin-top:2px; }
        .bcm-title { font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:4px; }
        .bcm-subtitle { display:flex; align-items:center; flex-wrap:wrap; gap:4px; font-size:.8rem; }
        .bcm-dot { color:var(--text-muted); margin:0 2px; }
        .bcm-close { background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--text-muted); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:var(--transition); flex-shrink:0; }
        .bcm-close:hover { background:rgba(255,71,87,.15); color:#FF4757; }
        .bcm-info-bar { display:flex; align-items:center; gap:var(--space-4); padding:var(--space-3) var(--space-6); background:rgba(0,0,0,.12); border-bottom:1px solid var(--border); font-size:.75rem; color:var(--text-muted); font-weight:600; flex-shrink:0; flex-wrap:wrap; }
        .bcm-messages { flex:1; overflow-y:auto; padding:var(--space-5) var(--space-6); display:flex; flex-direction:column; gap:var(--space-4); }
        .bcm-no-msgs { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:var(--space-3); color:var(--text-muted); text-align:center; padding:var(--space-10); }
        @media(max-width:600px) { .bcm-modal { max-height:95vh; } .bcm-header { padding:var(--space-4); } .bcm-messages { padding:var(--space-4); } }
        /* ── Ads Admin Card Grid ──────────────────────────── */
        .ads-header-row { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--space-4); margin-bottom:var(--space-6); flex-wrap:wrap; }
        .ads-card-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:var(--space-5); }
        .ad-admin-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; display:flex; flex-direction:column; transition:var(--transition); }
        .ad-admin-card:hover { border-color:var(--primary); box-shadow:0 0 0 1px var(--primary-glow); transform:translateY(-2px); }
        .ad-admin-img-wrap { position:relative; width:100%; height:0; padding-bottom:56.25%; background:#000; overflow:hidden; flex-shrink:0; }
        .ad-admin-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
        .ad-admin-status-badge { position:absolute; top:8px; right:8px; font-size:0.65rem !important; font-weight:700 !important; border:none !important; }
        .ad-admin-body { padding:var(--space-4); display:flex; flex-direction:column; flex:1; gap:var(--space-3); }
        .ad-admin-meta { display:flex; align-items:center; gap:var(--space-3); }
        .ad-admin-logo { width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--border); flex-shrink:0; }
        .ad-admin-logo-placeholder { width:36px; height:36px; border-radius:50%; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; border:1.5px solid var(--border); flex-shrink:0; }
        .ad-admin-actions { display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-top:auto; padding-top:var(--space-3); border-top:1px solid var(--border); }
        @media(max-width:480px) { .ads-card-grid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
