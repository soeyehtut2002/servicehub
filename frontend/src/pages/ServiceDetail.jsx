import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { SUPPORTED_CURRENCIES, getCurrencyMeta, formatCurrency, convertAmount, buildConversionLabel } from '../utils/currency';
import StarRating from '../components/StarRating';
import BookingModal from '../components/BookingModal';
import ReviewForm from '../components/ReviewForm';
import toast from 'react-hot-toast';
import { ZoomIn, X, MapPin, ShieldCheck, Camera, ClipboardList, Star, DollarSign, Tag, Clock, Users, MessageSquare, ArrowLeftRight, Lock, Calendar, Phone } from 'lucide-react';

import { BASE_URL as BASE } from '../config';
const src = (url, fallbackCat) => {
  if (!url) return `https://source.unsplash.com/800x500/?${encodeURIComponent(fallbackCat || 'service')}`;
  return url.startsWith('/uploads') ? `${BASE}${url}` : url;
};

// ── Build ordered gallery array ───────────────────────────────────────────────
const buildGallery = (service) => {
  if (!service) return [];
  const urls = Array.isArray(service.image_urls) && service.image_urls.length > 0
    ? service.image_urls
    : service.image_url ? [service.image_url] : [];
  return urls.map(u => src(u));
};

// ── Premium Gallery Component ─────────────────────────────────────────────────
const ServiceGallery = ({ images, title }) => {
  const [active,   setActive]   = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStart = useRef(null);

  const prev = useCallback(() => setActive(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive(i => (i + 1) % images.length), [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     setLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, prev, next]);

  // Touch swipe
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  if (images.length === 0) return null;

  const single = images.length === 1;

  return (
    <>
      <div className="sg-wrap">
        {/* Main image */}
        <div
          className="sg-main"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => setLightbox(true)}
        >
          <img src={images[active]} alt={`${title} — photo ${active + 1}`} className="sg-main-img" />
          {!single && (
            <>
              <button className="sg-nav sg-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
              <button className="sg-nav sg-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
              <div className="sg-counter">{active + 1} / {images.length}</div>
            </>
          )}
          <div className="sg-expand-hint" style={{display:'flex',alignItems:'center',gap:4}}><ZoomIn size={12} strokeWidth={2}/>Click to expand</div>
        </div>

        {/* Thumbnail strip — only when >1 image */}
        {!single && (
          <div className="sg-thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                className={`sg-thumb${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
                title={`Photo ${i + 1}`}
              >
                <img src={img} alt={`thumb ${i + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {lightbox && (
        <div
          className="sg-lightbox"
          onClick={() => setLightbox(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button className="sg-lb-close" onClick={() => setLightbox(false)}><X size={18} strokeWidth={2.5}/></button>
          {!single && (
            <>
              <button className="sg-lb-nav sg-lb-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
              <button className="sg-lb-nav sg-lb-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
            </>
          )}
          <img
            src={images[active]}
            alt={`${title} — photo ${active + 1}`}
            className="sg-lb-img"
            onClick={e => e.stopPropagation()}
          />
          {!single && (
            <div className="sg-lb-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`sg-lb-dot${i === active ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); setActive(i); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        /* ── Gallery wrapper ─────────────────────────────────────────── */
        .sg-wrap { border-radius:var(--radius-xl); overflow:hidden; box-shadow:var(--shadow-lg); background:#000; }

        /* ── Main image area ─────────────────────────────────────────── */
        .sg-main {
          position:relative; cursor:zoom-in; overflow:hidden;
          height:420px;
          background:#0a0a14;
        }
        .sg-main-img {
          width:100%; height:100%; object-fit:cover;
          transition:transform .4s ease;
          display:block;
        }
        .sg-main:hover .sg-main-img { transform:scale(1.02); }

        /* ── Nav arrows ──────────────────────────────────────────────── */
        .sg-nav {
          position:absolute; top:50%; transform:translateY(-50%);
          background:rgba(0,0,0,.55); color:#fff;
          border:none; border-radius:50%;
          width:44px; height:44px; font-size:1.6rem; line-height:1;
          cursor:pointer; transition:background .2s;
          display:flex; align-items:center; justify-content:center;
          z-index:2;
        }
        .sg-nav:hover { background:var(--primary); }
        .sg-prev { left:14px; }
        .sg-next { right:14px; }
        .sg-counter {
          position:absolute; bottom:12px; right:14px;
          background:rgba(0,0,0,.6); color:#fff;
          font-size:.75rem; font-weight:700;
          padding:3px 10px; border-radius:var(--radius-full);
          backdrop-filter:blur(4px);
        }
        .sg-expand-hint {
          position:absolute; bottom:12px; left:14px;
          background:rgba(0,0,0,.5); color:#fff;
          font-size:.72rem; padding:3px 10px;
          border-radius:var(--radius-full);
          opacity:0; transition:opacity .2s;
          backdrop-filter:blur(4px);
        }
        .sg-main:hover .sg-expand-hint { opacity:1; }

        /* ── Thumbnail strip ─────────────────────────────────────────── */
        .sg-thumbs {
          display:flex; gap:4px; padding:4px;
          background:#111; overflow-x:auto;
          scrollbar-width:thin;
        }
        .sg-thumb {
          flex-shrink:0; width:72px; height:52px;
          border:2px solid transparent; border-radius:6px;
          overflow:hidden; cursor:pointer; transition:border-color .2s;
          padding:0; background:none;
        }
        .sg-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .sg-thumb.active { border-color:var(--primary); }
        .sg-thumb:hover { border-color:rgba(14,165,233,.5); }

        /* ── Lightbox ────────────────────────────────────────────────── */
        .sg-lightbox {
          position:fixed; inset:0; z-index:3000;
          background:rgba(0,0,0,.96);
          display:flex; align-items:center; justify-content:center;
          animation:fadeIn .15s ease;
        }
        .sg-lb-img {
          max-width:92vw; max-height:88vh;
          object-fit:contain; border-radius:var(--radius-md);
          box-shadow:0 24px 80px rgba(0,0,0,.7);
        }
        .sg-lb-close {
          position:absolute; top:20px; right:20px;
          background:rgba(255,255,255,.12); color:#fff;
          border:1px solid rgba(255,255,255,.25); border-radius:50%;
          width:42px; height:42px; font-size:1.1rem;
          cursor:pointer; transition:.2s;
          display:flex; align-items:center; justify-content:center;
        }
        .sg-lb-close:hover { background:#EF4444; border-color:#EF4444; }
        .sg-lb-nav {
          position:absolute; top:50%; transform:translateY(-50%);
          background:rgba(255,255,255,.1); color:#fff;
          border:1px solid rgba(255,255,255,.2); border-radius:50%;
          width:52px; height:52px; font-size:2rem; line-height:1;
          cursor:pointer; transition:.2s;
          display:flex; align-items:center; justify-content:center;
          z-index:1;
        }
        .sg-lb-nav:hover { background:var(--primary); border-color:var(--primary); }
        .sg-lb-prev { left:20px; }
        .sg-lb-next { right:20px; }
        .sg-lb-dots {
          position:absolute; bottom:24px; left:50%; transform:translateX(-50%);
          display:flex; gap:8px;
        }
        .sg-lb-dot {
          width:8px; height:8px; border-radius:50%;
          background:rgba(255,255,255,.35); border:none; cursor:pointer; transition:.2s;
          padding:0;
        }
        .sg-lb-dot.active { background:#fff; transform:scale(1.3); }

        /* ── Mobile adjustments ──────────────────────────────────────── */
        @media(max-width:600px) {
          .sg-main { height:260px; }
          .sg-thumb { width:56px; height:42px; }
          .sg-lb-nav { width:40px; height:40px; font-size:1.5rem; }
        }
      `}</style>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ServiceDetail = () => {
  const { id }     = useParams();
  const { user }   = useAuth();
  const { rates }  = useCurrency();            // live rates only — no global preference
  const navigate   = useNavigate();
  const [service,          setService]          = useState(null);
  const [reviews,          setReviews]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showBooking,      setShowBooking]      = useState(false);
  const [tab,              setTab]              = useState('about');
  // Local currency selection — starts empty, set to service native currency on load
  const [selectedCurrency, setSelectedCurrency] = useState('');

  const fetchService = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        API.get(`/services/${id}`),
        API.get(`/reviews/service/${id}`),
      ]);
      const svcData = sRes.data;
      setService(svcData);
      setReviews(rRes.data.reviews || []);
      // Always set the native currency on load (resets if service changes)
      setSelectedCurrency(svcData.currency || 'USD');
    } catch {
      toast.error('Service not found');
      navigate('/services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchService(); }, [id]);

  if (loading) return <div className="spinner-container" style={{minHeight:'100vh'}}><div className="spinner"/></div>;
  if (!service) return null;

  // All derived values are computed here — AFTER the loading guard above,
  // so `service` is guaranteed to be non-null from this point forward.
  const nativeCurrency  = service.currency || 'USD';
  // Use selectedCurrency only when it is a valid non-empty string
  const displayCurrency = (selectedCurrency && selectedCurrency.length === 3)
    ? selectedCurrency
    : nativeCurrency;
  const displayMeta   = getCurrencyMeta(displayCurrency);   // always has correct .symbol
  const nativePrice   = parseFloat(service.price) || 0;
  const displayPrice  = convertAmount(nativePrice, nativeCurrency, displayCurrency, rates);
  const convLabel     = displayCurrency !== nativeCurrency
    ? buildConversionLabel(nativePrice, nativeCurrency, displayCurrency, rates)
    : null;

  const gallery = buildGallery(service);

  return (
    <div className="page-wrapper">

      {/* ── Hero (title overlay on first image) ────────────────────── */}
      <div className="detail-hero">
        <img src={gallery[0] || src(null, service.category)} alt={service.title} className="detail-hero-img" />
        <div className="detail-hero-overlay" />
        <div className="container detail-hero-content">
          <span className="badge badge-primary">{service.category}</span>
          <h1 className="detail-title">{service.title}</h1>
          <div className="detail-meta">
            <StarRating rating={parseFloat(service.avg_rating)} readonly />
            <span className="detail-rating-val">{parseFloat(service.avg_rating).toFixed(1)}</span>
            <span className="detail-reviews">({service.review_count} reviews)</span>
            <span className="detail-sep">•</span>
            <span style={{display:'flex',alignItems:'center',gap:4}}><MapPin size={13} strokeWidth={2}/>{service.location}</span>
            {service.provider_verified && <span className="verified-badge" style={{display:'inline-flex',alignItems:'center',gap:4}}><ShieldCheck size={12} strokeWidth={2.5}/>Verified Provider</span>}
            {gallery.length > 1 && (
              <span className="detail-photo-badge" style={{display:'inline-flex',alignItems:'center',gap:4}}><Camera size={12} strokeWidth={2}/>{gallery.length} photos</span>
            )}
          </div>
        </div>
      </div>

      <div className="container detail-layout">
        {/* ── Main Content ────────────────────────────────────────────── */}
        <div className="detail-main">

          {/* Photo Gallery — shown above tabs when there are images */}
          {gallery.length > 0 && (
            <div style={{marginBottom:'var(--space-6)'}}>
              <ServiceGallery images={gallery} title={service.title} />
            </div>
          )}

          {/* Tabs */}
          <div className="tabs mb-6">
            {['about','reviews'].map(t => (
              <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
                {t === 'about'
                  ? <span style={{display:'inline-flex',alignItems:'center',gap:6}}><ClipboardList size={14} strokeWidth={2}/>About</span>
                  : <span style={{display:'inline-flex',alignItems:'center',gap:6}}><Star size={14} strokeWidth={2}/>Reviews ({service.review_count})</span>
                }
              </button>
            ))}
          </div>

          {tab === 'about' ? (
            <div className="card" style={{padding:'var(--space-6)'}}>
              <h2 style={{fontSize:'1.2rem',fontWeight:700,marginBottom:'var(--space-4)'}}>About this Service</h2>
              <p style={{color:'var(--text-secondary)',lineHeight:1.8}}>{service.description}</p>
              <div className="divider"/>
              <div className="detail-info-grid">
                <div className="detail-info-item"><span className="detail-info-icon"><DollarSign size={20} strokeWidth={1.8}/></span><div><p className="detail-info-label">Price</p><p className="detail-info-value" style={{color:'var(--success)'}}>{displayMeta.symbol}{displayPrice.toLocaleString('en-US',{maximumFractionDigits:displayCurrency==='USD'?2:0})} <span style={{fontSize:'.8em',color:'var(--text-muted)'}}>{displayCurrency}</span></p>{convLabel&&<p style={{fontSize:'.78rem',color:'var(--text-muted)',marginTop:2}}>{convLabel}</p>}</div></div>
                <div className="detail-info-item"><span className="detail-info-icon"><MapPin size={20} strokeWidth={1.8}/></span><div><p className="detail-info-label">Location</p><p className="detail-info-value">{service.location}</p></div></div>
                <div className="detail-info-item"><span className="detail-info-icon"><Tag size={20} strokeWidth={1.8}/></span><div><p className="detail-info-label">Category</p><p className="detail-info-value">{service.category}</p></div></div>
                <div className="detail-info-item"><span className="detail-info-icon"><Clock size={20} strokeWidth={1.8}/></span><div><p className="detail-info-label">Duration</p><p className="detail-info-value">{service.duration_hours || 1} hour{(service.duration_hours||1)>1?'s':''} per job</p></div></div>
                {(service.team_count || 1) > 1 && (
                  <div className="detail-info-item"><span className="detail-info-icon"><Users size={20} strokeWidth={1.8}/></span><div><p className="detail-info-label">Capacity</p><p className="detail-info-value">{service.team_count} teams — up to {service.team_count} bookings per slot</p></div></div>
                )}
              </div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
              {user?.role === 'customer' && (
                <ReviewForm
                  serviceId={service.id}
                  existingReview={reviews.find(r => r.customer_id === user.id)}
                  onReviewSubmitted={fetchService}
                />
              )}
              {reviews.length === 0 ? (
                <div className="empty-state"><div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><MessageSquare size={40} strokeWidth={1.5}/></div><p>No reviews yet. Be the first!</p></div>
              ) : reviews.map((r) => (
                <div key={r.id} className="card review-card">
                  <div className="review-header">
                    <div className="avatar">{r.customer_name?.[0]?.toUpperCase()}</div>
                    <div>
                      <p className="review-author">{r.customer_name}</p>
                      <p className="review-date">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{marginLeft:'auto'}}><StarRating rating={r.rating} readonly size="sm" /></div>
                  </div>
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                  {r.image_urls && r.image_urls.length > 0 && (
                    <div className="review-images">
                      {r.image_urls.map((url, i) => (
                        <a key={i} href={url.startsWith('/uploads') ? `${BASE}${url}` : url} target="_blank" rel="noreferrer">
                          <img src={url.startsWith('/uploads') ? `${BASE}${url}` : url} alt={`Review photo ${i+1}`} className="review-img-thumb-view" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="detail-sidebar">
          <div className="booking-card">
            {/* ── Currency Switcher ───────────────────────────────────── */}
            <div className="sd-cur-row">
              <span className="sd-cur-label">View price in</span>
              <div className="sd-cur-pills">
                {SUPPORTED_CURRENCIES.map(cur => (
                  <button
                    key={cur.code}
                    className={`sd-cur-pill${displayCurrency === cur.code ? ' active' : ''}`}
                    onClick={() => setSelectedCurrency(cur.code)}
                    title={cur.name}
                  >
                    {cur.flag} {cur.code}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Price Display ──────────────────────────────────────── */}
            <div className="booking-price">
              <span className="currency" key={displayCurrency}>{displayMeta.symbol}</span>
              <span className="booking-amount">
                {displayPrice.toLocaleString('en-US', {
                  maximumFractionDigits: displayCurrency === 'USD' ? 2 : 0,
                  minimumFractionDigits: 0,
                })}
              </span>
              <span className="booking-cur-code">{displayCurrency}</span>
              <span className="booking-per"> / service</span>
            </div>

            {/* Conversion label shown when currency differs from native */}
            {convLabel && (
                <div className="booking-converted" style={{display:'flex',alignItems:'center',gap:6}}><ArrowLeftRight size={14} strokeWidth={2}/>{convLabel}</div>
            )}
            <div className="divider"/>
            <Link
              to={user ? `/profile/${service.provider_id}` : '/login'}
              className="provider-info-link"
              title="View provider profile"
            >
              <div className="provider-info">
                {service.provider_avatar
                  ? <img src={service.provider_avatar.startsWith('/uploads') ? `${BASE}${service.provider_avatar}` : service.provider_avatar} alt={service.provider_name} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--primary)',flexShrink:0}} />
                  : <div className="avatar avatar-lg">{service.provider_name?.[0]?.toUpperCase()}</div>
                }
                <div style={{flex:1}}>
                  <p className="provider-name">{service.provider_name}</p>
                  <p className="provider-label">{service.provider_verified ? <span style={{display:'inline-flex',alignItems:'center',gap:4}}><ShieldCheck size={11} strokeWidth={2.5}/>Verified Provider</span> : 'Service Provider'}</p>
                  {service.provider_location && <p style={{fontSize:'.78rem',color:'var(--text-muted)',marginTop:2,display:'flex',alignItems:'center',gap:4}}><MapPin size={11} strokeWidth={2}/>{service.provider_location}</p>}
                </div>
                <span className="provider-arrow">→</span>
              </div>
            </Link>
            {service.provider_bio && <p style={{fontSize:'.85rem',color:'var(--text-secondary)',lineHeight:1.6,padding:'var(--space-4)',background:'rgba(14,165,233,.06)',borderRadius:'var(--radius-md)'}}>{service.provider_bio}</p>}

            <div className="divider"/>
            {!user ? (
              <Link to="/login" className="btn btn-primary w-full btn-lg" state={{ from: { pathname: `/services/${id}` } }} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Lock size={15} strokeWidth={2}/>Login to Book</Link>
            ) : user.role === 'customer' ? (
              <>
                <button className="btn btn-primary w-full btn-lg" onClick={() => setShowBooking(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Calendar size={16} strokeWidth={2}/>Book Now</button>
                <Link to={`/chat/${service.provider_id}`} className="btn btn-outline w-full" style={{marginTop:'var(--space-2)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><MessageSquare size={15} strokeWidth={2}/>Message Provider</Link>
              </>
            ) : (
              <div className="alert alert-info" style={{textAlign:'center'}}>Only customers can book services</div>
            )}
            {service.provider_phone && <p style={{textAlign:'center',fontSize:'.8rem',color:'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Phone size={12} strokeWidth={2}/>{service.provider_phone}</p>}
          </div>
        </aside>
      </div>

      {showBooking && <BookingModal service={service} onClose={() => setShowBooking(false)} onBooked={() => navigate('/dashboard/customer')} />}

      <style>{`
        .detail-hero { position:relative; height:300px; overflow:hidden; margin-bottom:0; }
        .detail-hero-img { width:100%; height:100%; object-fit:cover; }
        .detail-hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(10,10,20,.9) 0%,rgba(10,10,20,.3) 100%); }
        .detail-hero-content { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:100%; padding-bottom:var(--space-6); display:flex; flex-direction:column; gap:var(--space-2); }
        .detail-title { font-size:clamp(1.3rem,3vw,2.5rem); font-weight:900; text-shadow:0 2px 8px rgba(0,0,0,.5); }
        .detail-meta { display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; font-size:.875rem; color:var(--text-secondary); }
        .detail-rating-val { font-weight:700; color:var(--text-primary); }
        .detail-reviews { color:var(--text-muted); }
        .detail-sep { color:var(--text-muted); }
        .detail-photo-badge { background:rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.2); border-radius:var(--radius-full); padding:2px 10px; font-size:.75rem; backdrop-filter:blur(4px); color:#fff; }
        .detail-layout { display:grid; grid-template-columns:1fr 340px; gap:var(--space-8); padding-top:var(--space-8); padding-bottom:var(--space-16); align-items:start; }
        .booking-card { background:var(--gradient-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-6); display:flex; flex-direction:column; gap:var(--space-5); position:sticky; top:88px; box-shadow:var(--shadow-card); }
        .booking-price { font-size:1.9rem; font-weight:900; color:var(--success); display:flex; align-items:baseline; gap:4px; flex-wrap:wrap; }
        .booking-cur-code { font-size:.55em; font-weight:600; color:var(--text-muted); }
        .booking-converted { font-size:.88rem; color:var(--text-secondary); background:rgba(14,165,233,.07); border:1px solid rgba(14,165,233,.15); border-radius:var(--radius-md); padding:6px 10px; margin-top:-8px; }
        .booking-per { font-size:.9rem; font-weight:400; color:var(--text-muted); }
        .sd-cur-row { display:flex; flex-direction:column; gap:6px; }
        .sd-cur-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); }
        .sd-cur-pills { display:flex; gap:6px; flex-wrap:wrap; }
        .sd-cur-pill { padding:5px 10px; border-radius:20px; font-size:.78rem; font-weight:700; border:1.5px solid var(--border); background:#fff; color:var(--text-secondary); cursor:pointer; transition:all .18s; white-space:nowrap; }
        .sd-cur-pill:hover:not(.active) { border-color:var(--primary); color:var(--primary-dark); background:rgba(14,165,233,.06); }
        .sd-cur-pill.active { background:linear-gradient(135deg,#6C63FF,#0ea5e9); border-color:transparent; color:#fff; box-shadow:0 2px 10px rgba(108,99,255,.35); }
        .provider-info { display:flex; align-items:center; gap:var(--space-4); }
        .provider-info-link { display:block; text-decoration:none; border-radius:var(--radius-md); padding:var(--space-3); margin:-var(--space-3); border:1px solid transparent; transition:var(--transition); }
        .provider-info-link:hover { background:rgba(14,165,233,.07); border-color:var(--border-hover); transform:translateY(-2px); box-shadow:var(--shadow-sm); }
        .provider-info-link:hover .provider-arrow { opacity:1; transform:translateX(3px); color:var(--primary); }
        .provider-arrow { font-size:1.1rem; color:var(--text-muted); opacity:0; transition:var(--transition); flex-shrink:0; }
        .provider-name { font-weight:700; font-size:.95rem; color:var(--text-primary); }
        .provider-label { font-size:.75rem; color:var(--success); }
        .detail-info-grid { display:flex; flex-direction:column; gap:var(--space-4); margin-top:var(--space-4); }
        .detail-info-item { display:flex; align-items:center; gap:var(--space-4); }
        .detail-info-icon { width:36px; display:flex; align-items:center; justify-content:center; color:var(--primary-dark); flex-shrink:0; }
        .detail-info-label { font-size:.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; }
        .detail-info-value { font-weight:700; font-size:.95rem; margin-top:2px; }
        .review-card { padding:var(--space-5); }
        .review-header { display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-3); }
        .review-author { font-weight:700; font-size:.9rem; }
        .review-date { font-size:.75rem; color:var(--text-muted); }
        .review-comment { font-size:.875rem; color:var(--text-secondary); line-height:1.6; }
        .review-images { display:flex; flex-wrap:wrap; gap:var(--space-2); margin-top:var(--space-3); }
        .review-img-thumb-view { width:72px; height:72px; object-fit:cover; border-radius:var(--radius-md); border:1px solid var(--border); cursor:pointer; transition:var(--transition); }
        .review-img-thumb-view:hover { transform:scale(1.05); border-color:var(--primary); }
        @media(max-width:900px){
          .detail-layout{grid-template-columns:1fr;}
          .booking-card{position:static;}
          .detail-sidebar { order: -1; }
        }
        @media(max-width:600px){
          .detail-hero { height: 220px; }
          .detail-hero-content { padding-bottom: var(--space-4); }
          .detail-title { font-size: clamp(1.1rem, 5vw, 1.8rem); }
          .detail-meta { gap: var(--space-1); font-size: 0.78rem; }
          .booking-card { padding: var(--space-4); }
          .booking-price { font-size: 1.5rem; }
          .sd-cur-pills {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
            gap: 6px;
            width: 100%;
          }
          .sd-cur-pill {
            width: 100%;
            text-align: center;
            justify-content: center;
            padding: 5px 8px;
            font-size: 0.72rem;
          }
          .review-card { padding: var(--space-4); }
        }
      `}</style>
    </div>
  );
};

export default ServiceDetail;
