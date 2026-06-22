import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, MapPin, Calendar, MessageSquare, Star, Mail, Phone, Key, BarChart2, Lock, Wrench, Image, ZoomIn, X, User } from 'lucide-react';
import { getCurrencyMeta } from '../utils/currency';
import { BASE_URL } from '../config';

const avatarSrc = (url) => {
  if (!url) return null;
  return url.startsWith('/uploads') ? `${BASE_URL}${url}` : url;
};

const imgSrc = (url) => {
  if (!url) return null;  // return null so we can show a gradient placeholder instead
  return url.startsWith('/uploads') ? `${BASE_URL}${url}` : url;
};

const AVAIL_MAP = {
  available:    { color: '#10B981', label: '● Available' },
  fully_booked: { color: '#EF4444', label: '● Fully Booked' },
  paused:       { color: '#F59E0B', label: '⏸ Paused' },
};

const ViewProfilePage = () => {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lightbox, setLightbox] = useState(null); // lightbox image url

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetch = async () => {
      try {
        // Admin uses the richer admin endpoint; others use the public one
        const endpoint = isAdmin ? `/admin/users/${id}` : `/profile/${id}`;
        const res = await API.get(endpoint);
        setProfile(res.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load profile');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, isAdmin]);

  if (loading) return (
    <div className="spinner-container" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!profile) return null;

  const photo      = avatarSrc(profile.avatar_url);
  const isProvider = profile.role === 'provider';
  const stats      = profile.stats || {};

  return (
    <div className="page-wrapper">

      {/* ── Cover / Hero ─────────────────────────────────────────────── */}
      <div className="vp-cover">
        <div className="vp-cover-gradient" />
        <div className="container">
          <div className="vp-hero">
            {/* Avatar */}
            <div className="vp-avatar-wrap">
              {photo
                ? <img src={photo} alt={profile.name} className="vp-avatar-img" />
                : <div className="vp-avatar-placeholder">{profile.name?.[0]?.toUpperCase()}</div>
              }
              {profile.is_verified && (
                <span className="vp-verified-ring" title="Verified"><ShieldCheck size={14} strokeWidth={2.5}/></span>
              )}
            </div>

            {/* Identity */}
            <div className="vp-identity">
              <div className="vp-name-row">
                <h1 className="vp-name">{profile.name}</h1>
                {profile.is_verified && (
                  <span className="badge badge-success" style={{ fontSize: '.72rem', display:'inline-flex', alignItems:'center', gap:4 }}><ShieldCheck size={11} strokeWidth={2.5}/>Verified</span>
                )}
              </div>
              <div className="vp-badges">
                <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{profile.role}</span>
                {profile.account_type && (
                  <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{profile.account_type}</span>
                )}
                {isAdmin && !profile.is_active && (
                  <span className="badge badge-danger">● Inactive</span>
                )}
              </div>
              <div className="vp-meta-row">
                {profile.location && <span className="vp-meta-chip" style={{display:'inline-flex',alignItems:'center',gap:5}}><MapPin size={12} strokeWidth={2}/>{profile.location}</span>}
                <span className="vp-meta-chip" style={{display:'inline-flex',alignItems:'center',gap:5}}><Calendar size={12} strokeWidth={2}/>Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="vp-actions">
              {user?.id !== parseInt(id) && (
                <Link to={`/chat/${id}`} className="btn btn-primary" style={{display:'inline-flex',alignItems:'center',gap:8}}><MessageSquare size={15} strokeWidth={2}/>Send Message</Link>
              )}
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container vp-body">

        {/* ── Provider Stats Strip ──────────────────────────────────── */}
        {isProvider && (
          <div className="vp-stats-strip">
            <div className="vp-stat">
              <span className="vp-stat-value">{profile.services?.length || 0}</span>
              <span className="vp-stat-label">Services</span>
            </div>
            <div className="vp-stat-divider" />
            <div className="vp-stat">
              <span className="vp-stat-value" style={{display:'inline-flex',alignItems:'center',gap:4}}><Star size={16} strokeWidth={2} color="#F59E0B" fill="#F59E0B"/>{parseFloat(stats.overall_rating || 0).toFixed(1)}</span>
              <span className="vp-stat-label">Avg Rating</span>
            </div>
            <div className="vp-stat-divider" />
            <div className="vp-stat">
              <span className="vp-stat-value">{stats.total_reviews || 0}</span>
              <span className="vp-stat-label">Reviews</span>
            </div>
            <div className="vp-stat-divider" />
            <div className="vp-stat">
              <span className="vp-stat-value">{stats.total_bookings || 0}</span>
              <span className="vp-stat-label">Bookings</span>
            </div>
          </div>
        )}

        <div className="vp-content-grid">

          {/* ── Left Column ─────────────────────────────────────── */}
          <aside className="vp-sidebar">

            {/* About */}
            {profile.bio && (
              <div className="vp-card">
                <h3 className="vp-card-title">About</h3>
                <p className="vp-bio">{profile.bio}</p>
              </div>
            )}

            {/* Contact info — admin sees full detail */}
            <div className="vp-card">
              <h3 className="vp-card-title">Contact Info</h3>
              <div className="vp-info-list">
                {profile.location && (
                  <div className="vp-info-row">
                    <span className="vp-info-icon"><MapPin size={15} strokeWidth={2}/></span>
                    <span>{profile.location}</span>
                  </div>
                )}
                {isAdmin && profile.email && (
                  <div className="vp-info-row">
                    <span className="vp-info-icon"><Mail size={15} strokeWidth={2}/></span>
                    <span>{profile.email}</span>
                  </div>
                )}
                {isAdmin && profile.phone && (
                  <div className="vp-info-row">
                    <span className="vp-info-icon"><Phone size={15} strokeWidth={2}/></span>
                    <span>{profile.phone}</span>
                  </div>
                )}
                {!profile.location && !(isAdmin && (profile.email || profile.phone)) && (
                  <p className="vp-empty-text">No contact info provided</p>
                )}
              </div>
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="vp-card vp-admin-card">
                <h3 className="vp-card-title" style={{display:'flex',alignItems:'center',gap:6}}><Key size={14} strokeWidth={2}/>Admin Info</h3>
                <div className="vp-info-list">
                  <div className="vp-info-row">
                    <span className="vp-info-icon" style={{fontWeight:900,fontSize:'.75rem'}}>#</span>
                    <span>User ID: <strong>{profile.id}</strong></span>
                  </div>
                  <div className="vp-info-row">
                    <span className="vp-info-icon"><BarChart2 size={15} strokeWidth={2}/></span>
                    <span>Status: <span className={`badge ${profile.is_active ? 'badge-success' : 'badge-danger'}`}>{profile.is_active ? 'Active' : 'Inactive'}</span></span>
                  </div>
                  <div className="vp-info-row">
                    <span className="vp-info-icon"><Lock size={15} strokeWidth={2}/></span>
                    <span>Role: <span className="badge badge-primary">{profile.role}</span></span>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to="/dashboard/admin?tab=users" className="btn btn-ghost btn-sm">← Users List</Link>
                </div>
              </div>
            )}
          </aside>

          {/* ── Right Column ────────────────────────────────────── */}
          <div className="vp-main">

            {/* Services (providers only) */}
            {isProvider && profile.services && profile.services.length > 0 && (
              <div>
                <h2 className="vp-section-title" style={{display:'flex',alignItems:'center',gap:8}}><Wrench size={18} strokeWidth={2}/>Services</h2>
                <div className="vp-services-grid">
                  {profile.services.map((svc, idx) => {
                    const avail = AVAIL_MAP[svc.availability_status] || AVAIL_MAP.available;
                    const imgUrl = imgSrc(svc.image_url);
                    return (
                      <Link key={svc.id} to={`/services/${svc.id}`} className="vp-service-card">
                        <div className="vp-service-img">
                          {imgUrl ? (
                            <img src={imgUrl} alt={svc.title} />
                          ) : (
                            <div style={{
                              width:'100%', height:'100%',
                              background:`linear-gradient(135deg,hsl(${(svc.id*47)%360},55%,65%),hsl(${(svc.id*47+100)%360},45%,55%))`,
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem'
                            }}>🛠️</div>
                          )}
                          <div className="vp-service-avail" style={{ color: avail.color }}>{avail.label}</div>
                        </div>
                        <div className="vp-service-body">
                          <div className="vp-service-category">{svc.category}</div>
                          <h4 className="vp-service-title">{svc.title}</h4>
                          {svc.service_location && (
                            <p className="vp-service-loc" style={{display:'flex',alignItems:'center',gap:4}}><MapPin size={11} strokeWidth={2}/>{svc.service_location}</p>
                          )}
                          <div className="vp-service-footer">
                            <span className="vp-service-price">{(() => { const cur = svc.currency || 'USD'; const meta = getCurrencyMeta(cur); return `${meta.symbol}${parseFloat(svc.price).toLocaleString('en-US', { maximumFractionDigits: cur === 'USD' ? 2 : 0 })} ${cur}`; })()}</span>
                            <span className="vp-service-rating" style={{display:'inline-flex',alignItems:'center',gap:4}}>
                              <Star size={12} strokeWidth={2} fill="#F59E0B" color="#F59E0B"/>{parseFloat(svc.avg_rating || 0).toFixed(1)}
                              <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}> ({svc.review_count})</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {isProvider && (!profile.services || profile.services.length === 0) && (
              <div className="vp-card">
                <div className="empty-state" style={{ minHeight: 120 }}>
                  <div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><Wrench size={40} strokeWidth={1.5}/></div>
                  <p>This provider hasn't listed any services yet.</p>
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {profile.gallery_urls && profile.gallery_urls.length > 0 && (
              <div>
                <h2 className="vp-section-title" style={{display:'flex',alignItems:'center',gap:8}}><Image size={18} strokeWidth={2}/>Photo Gallery</h2>
                <div className="vp-gallery-grid">
                  {profile.gallery_urls.map((url, i) => (
                    <div
                      key={i}
                      className="vp-gallery-item"
                      onClick={() => setLightbox(url.startsWith('/uploads') ? `${BASE_URL}${url}` : url)}
                    >
                      <img
                        src={url.startsWith('/uploads') ? `${BASE_URL}${url}` : url}
                        alt={`Gallery ${i + 1}`}
                      />
                      <div className="vp-gallery-overlay" style={{fontSize:'unset'}}><ZoomIn size={28} strokeWidth={1.5} color="#fff"/></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No content fallback for customers */}
            {!isProvider && (!profile.gallery_urls || profile.gallery_urls.length === 0) && (
              <div className="vp-card">
                <div className="empty-state" style={{ minHeight: 120 }}>
                  <div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><User size={40} strokeWidth={1.5}/></div>
                  <p>This user hasn't added any public content yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="vp-lightbox" onClick={() => setLightbox(null)}>
          <button className="vp-lightbox-close" onClick={() => setLightbox(null)}><X size={18} strokeWidth={2.5}/></button>
          <img
            src={lightbox}
            alt="Gallery photo"
            className="vp-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        /* ── Cover ─────────────────────────────────────────────── */
        .vp-cover {
          position: relative;
          background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%);
          padding: var(--space-8) 0 0;
          overflow: hidden;
        }
        .vp-cover-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(14,165,233,.12) 0%, rgba(99,102,241,.08) 100%);
          pointer-events: none;
        }
        .vp-hero {
          display: flex;
          align-items: flex-end;
          gap: var(--space-6);
          padding-bottom: var(--space-6);
          flex-wrap: wrap;
        }

        /* ── Avatar ─────────────────────────────────────────────── */
        .vp-avatar-wrap {
          position: relative;
          flex-shrink: 0;
          margin-bottom: -40px;
        }
        .vp-avatar-img {
          width: 120px; height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #fff;
          box-shadow: 0 8px 32px rgba(14,165,233,.25);
        }
        .vp-avatar-placeholder {
          width: 120px; height: 120px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 2.8rem; font-weight: 800; color: #fff;
          border: 4px solid #fff;
          box-shadow: 0 8px 32px rgba(14,165,233,.25);
        }
        .vp-verified-ring {
          position: absolute; bottom: 4px; right: 4px;
          width: 26px; height: 26px;
          background: var(--success);
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem; color: #fff; font-weight: 800;
        }

        /* ── Identity ───────────────────────────────────────────── */
        .vp-identity { flex: 1; min-width: 200px; }
        .vp-name-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-2); }
        .vp-name { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; color: var(--text-primary); }
        .vp-badges { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3); }
        .vp-meta-row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
        .vp-meta-chip {
          font-size: .8rem; color: var(--text-secondary);
          background: rgba(255,255,255,.7);
          border: 1px solid rgba(14,165,233,.2);
          border-radius: var(--radius-full);
          padding: 3px 12px;
          backdrop-filter: blur(4px);
        }
        .vp-actions {
          display: flex; gap: var(--space-3); flex-shrink: 0;
          margin-left: auto;
          padding-bottom: var(--space-2);
        }

        /* ── Body ───────────────────────────────────────────────── */
        .vp-body { padding-top: var(--space-12); padding-bottom: var(--space-10); }

        /* ── Stats Strip ─────────────────────────────────────────── */
        .vp-stats-strip {
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-5) var(--space-8);
          margin-bottom: var(--space-8);
          box-shadow: var(--shadow-md);
          flex-wrap: wrap;
          gap: var(--space-4);
        }
        .vp-stat { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 80px; }
        .vp-stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); }
        .vp-stat-label { font-size: .75rem; color: var(--text-muted); margin-top: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
        .vp-stat-divider { width: 1px; height: 40px; background: var(--border); flex-shrink: 0; }

        /* ── Content Grid ────────────────────────────────────────── */
        .vp-content-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: var(--space-8);
          align-items: start;
        }
        .vp-sidebar { display: flex; flex-direction: column; gap: var(--space-5); position: sticky; top: 88px; }

        /* ── Cards ──────────────────────────────────────────────── */
        .vp-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          box-shadow: var(--shadow-sm);
        }
        .vp-admin-card { border-color: rgba(14,165,233,.3); background: rgba(14,165,233,.03); }
        .vp-card-title { font-size: .95rem; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-4); }
        .vp-bio { font-size: .875rem; color: var(--text-secondary); line-height: 1.7; }

        /* ── Info List ──────────────────────────────────────────── */
        .vp-info-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .vp-info-row { display: flex; align-items: center; gap: var(--space-3); font-size: .875rem; color: var(--text-secondary); }
        .vp-info-icon { display:flex; align-items:center; flex-shrink:0; color:var(--primary-dark); }
        .vp-empty-text { font-size: .82rem; color: var(--text-muted); font-style: italic; }

        /* ── Section Title ───────────────────────────────────────── */
        .vp-section-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-5); }
        .vp-main { display: flex; flex-direction: column; gap: var(--space-8); }

        /* ── Service Cards ───────────────────────────────────────── */
        .vp-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--space-4);
        }
        .vp-service-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: var(--transition);
          box-shadow: var(--shadow-sm);
          text-decoration: none;
          display: block;
        }
        .vp-service-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        .vp-service-img {
          height: 160px;
          overflow: hidden;
          position: relative;
        }
        .vp-service-img img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform .4s ease;
        }
        .vp-service-card:hover .vp-service-img img { transform: scale(1.05); }
        .vp-service-avail {
          position: absolute; bottom: 8px; left: 8px;
          font-size: .72rem; font-weight: 700;
          background: rgba(255,255,255,.9);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          backdrop-filter: blur(4px);
        }
        .vp-service-body { padding: var(--space-4); }
        .vp-service-category {
          font-size: .72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: .06em; color: var(--primary);
          margin-bottom: var(--space-1);
        }
        .vp-service-title {
          font-size: .95rem; font-weight: 700; color: var(--text-primary);
          line-height: 1.3; margin-bottom: var(--space-2);
        }
        .vp-service-loc { font-size: .75rem; color: var(--text-muted); margin-bottom: var(--space-3); }
        .vp-service-footer {
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1px solid var(--border); padding-top: var(--space-3);
        }
        .vp-service-price { font-size: 1rem; font-weight: 800; color: var(--success); }
        .vp-service-rating { font-size: .82rem; font-weight: 600; color: var(--text-primary); }

        /* ── Gallery ─────────────────────────────────────────────── */
        .vp-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--space-3);
        }
        .vp-gallery-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border);
          cursor: pointer;
        }
        .vp-gallery-item img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform .3s ease;
        }
        .vp-gallery-item:hover img { transform: scale(1.08); }
        .vp-gallery-overlay {
          position: absolute; inset: 0;
          background: rgba(14,165,233,.3);
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity .2s;
        }
        .vp-gallery-item:hover .vp-gallery-overlay { opacity: 1; }

        /* ── Lightbox ────────────────────────────────────────────── */
        .vp-lightbox {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.88);
          z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          padding: var(--space-6);
          animation: fadeIn .2s ease;
        }
        .vp-lightbox-img {
          max-width: 90vw;
          max-height: 88vh;
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 80px rgba(0,0,0,.6);
          object-fit: contain;
        }
        .vp-lightbox-close {
          position: absolute; top: var(--space-6); right: var(--space-6);
          background: rgba(255,255,255,.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,.3);
          border-radius: 50%;
          width: 40px; height: 40px;
          font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: var(--transition);
        }
        .vp-lightbox-close:hover { background: var(--danger); border-color: var(--danger); }

        /* ── Responsive ──────────────────────────────────────────── */
        @media (max-width: 900px) {
          .vp-content-grid { grid-template-columns: 1fr; }
          .vp-sidebar { position: static; }
          .vp-hero { flex-direction: column; align-items: flex-start; }
          .vp-actions { margin-left: 0; }
          .vp-avatar-wrap { margin-bottom: -20px; }
          .vp-body { padding-top: var(--space-10); }
        }
        @media (max-width: 600px) {
          .vp-stats-strip { padding: var(--space-4); }
          .vp-stat-value { font-size: 1.2rem; }
          .vp-stat-divider { display: none; }
        }
      `}</style>
    </div>
  );
};

export default ViewProfilePage;
