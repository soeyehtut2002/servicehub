import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import ServiceCard from '../components/ServiceCard';
import { useLang } from '../context/LangContext';
import { Sparkles, Wrench, Zap, Leaf, Paintbrush, Package, BookOpen, Camera, Search, Star, CalendarCheck, ShieldCheck, Clock, Award, Hammer, Cpu, Globe, Headphones, Shield, Briefcase } from 'lucide-react';

const CATEGORIES = [
  { name: 'Cleaning',    Icon: Sparkles,   color: '#0EA5E9' },
  { name: 'Plumbing',    Icon: Wrench,     color: '#6366F1' },
  { name: 'Electrical',  Icon: Zap,        color: '#F59E0B' },
  { name: 'Gardening',   Icon: Leaf,       color: '#10B981' },
  { name: 'Painting',    Icon: Paintbrush, color: '#EC4899' },
  { name: 'Moving',      Icon: Package,    color: '#8B5CF6' },
  { name: 'Tutoring',    Icon: BookOpen,   color: '#14B8A6' },
  { name: 'Photography', Icon: Camera,     color: '#F97316' },
  { name: 'Repairing',   Icon: Hammer,     color: '#EF4444' },
  { name: 'Installing',  Icon: Wrench,     color: '#10B981' },
  { name: 'Tech',        Icon: Cpu,        color: '#06B6D4' },
  { name: 'Website',     Icon: Globe,      color: '#3B82F6' },
  { name: 'Customer Service', Icon: Headphones, color: '#8B5CF6' },
  { name: 'Page Admin',  Icon: Shield,     color: '#EC4899' },
  { name: 'Parttime',    Icon: Clock,      color: '#F59E0B' },
  { name: 'Fulltime Job',Icon: Briefcase,  color: '#10B981' },
];

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useLang();

  useEffect(() => {
    API.get('/services/featured')
      .then(res => setFeatured(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/services?keyword=${encodeURIComponent(searchQuery.trim())}` : '/services');
  };

  return (
    <div className="home">

      {/* ─── Hero with photo background ─── */}
      <section className="hero">
        <div className="hero-photo-bg" />
        <div className="hero-overlay" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />

        <div className="container hero-content">
          <div className="hero-badge">
            <ShieldCheck size={14} strokeWidth={2.5} />
            {t('hero_badge')}
          </div>
          <h1 className="hero-title">
            {t('hero_title1')}<br />
            <span className="hero-gradient-text">{t('hero_title2')}</span>
          </h1>
          <p className="hero-subtitle">{t('hero_subtitle')}</p>

          <form className="hero-search" onSubmit={handleSearch}>
            <div className="hero-search-inner">
              <span className="hero-search-icon"><Search size={17} strokeWidth={2} /></span>
              <input
                type="text"
                placeholder={t('hero_search_ph')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
              <button type="submit" className="btn btn-primary hero-search-btn">
                {t('hero_btn')}
              </button>
            </div>
          </form>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">500+</span>
              <span className="hero-stat-label">{t('hero_stat_svc')}</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">200+</span>
              <span className="hero-stat-label">{t('hero_stat_pro')}</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">4.9★</span>
              <span className="hero-stat-label">{t('hero_stat_rat')}</span>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="hero-trust">
            <div className="trust-item"><ShieldCheck size={15} strokeWidth={2} /><span>Verified Pros</span></div>
            <div className="trust-item"><Clock size={15} strokeWidth={2} /><span>Instant Booking</span></div>
            <div className="trust-item"><Award size={15} strokeWidth={2} /><span>Quality Guaranteed</span></div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <div className="scroll-dot" />
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section className="section section-sm categories-section">
        <div className="container">
          <h2 className="section-title text-center">{t('cat_title')}</h2>
          <p className="section-subtitle text-center text-muted">{t('cat_subtitle')}</p>
          <div className="categories-grid">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={`/services?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
              >
                <span className="category-icon" style={{ color: cat.color, background: `${cat.color}18` }}>
                  <cat.Icon size={26} strokeWidth={1.5} />
                </span>
                <span className="category-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Services ─── */}
      <section className="section">
        <div className="container">
          <div className="flex-between mb-8">
            <div>
              <h2 className="h2">{t('featured_title')}</h2>
              <p className="text-muted mt-2">{t('featured_subtitle')}</p>
            </div>
            <Link to="/services" className="btn btn-outline hide-mobile">{t('featured_viewall')}</Link>
          </div>
          {loading ? (
            <div className="spinner-container"><div className="spinner" /></div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><Search size={40} strokeWidth={1.5}/></div>
              <p>No services yet. <Link to="/register" className="text-primary-color">Be the first provider!</Link></p>
            </div>
          ) : (
            <div className="grid-services grid">
              {featured.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
          <div className="text-center mt-8">
            <Link to="/services" className="btn btn-primary btn-lg">{t('featured_explore')}</Link>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="section how-section">
        <div className="container">
          <h2 className="h2 text-center mb-8">{t('how_title')}</h2>
          <div className="how-grid">
            {[
              { step: '01', Icon: Search,       title: t('how_1_title'), desc: t('how_1_desc'), color: '#0EA5E9' },
              { step: '02', Icon: CalendarCheck, title: t('how_2_title'), desc: t('how_2_desc'), color: '#6366F1' },
              { step: '03', Icon: Star,          title: t('how_3_title'), desc: t('how_3_desc'), color: '#F59E0B' },
            ].map((item) => (
              <div key={item.step} className="how-card">
                <div className="how-step">{item.step}</div>
                <div className="how-icon-wrap" style={{ background: `${item.color}18`, color: item.color }}>
                  <item.Icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="how-title">{item.title}</h3>
                <p className="how-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <div className="cta-bg" />
        <div className="cta-glow" />
        <div className="container cta-content">
          <div className="cta-badge">🚀 Join Today</div>
          <h2 className="cta-title">{t('cta_title')}</h2>
          <p className="cta-subtitle">{t('cta_subtitle')}</p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-btn-primary">{t('cta_btn1')}</Link>
            <Link to="/services"  className="cta-btn-ghost">{t('cta_btn2')}</Link>
          </div>
        </div>
      </section>

      <style>{`
        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex; align-items: center;
          overflow: hidden;
          padding-top: 64px;
        }
        .hero-photo-bg {
          position: absolute; inset: 0;
          background-image: url('/hero-bg.jpg');
          background-size: cover;
          background-position: center 30%;
          background-repeat: no-repeat;
          transform: scale(1.04);
          animation: heroZoom 20s ease-in-out infinite alternate;
        }
        @keyframes heroZoom {
          from { transform: scale(1.04); }
          to   { transform: scale(1.10); }
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            160deg,
            rgba(10,20,50,0.82) 0%,
            rgba(10,30,60,0.75) 40%,
            rgba(5,15,35,0.70) 100%
          );
        }
        [data-theme="light"] .hero-overlay {
          background: linear-gradient(
            160deg,
            rgba(8,25,60,0.75) 0%,
            rgba(10,30,80,0.65) 40%,
            rgba(5,15,40,0.60) 100%
          );
        }
        .hero-orb {
          position: absolute; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }
        .hero-orb-1 { width: 500px; height: 500px; background: rgba(14,165,233,0.18); top: -80px; left: -100px; }
        .hero-orb-2 { width: 360px; height: 360px; background: rgba(99,102,241,0.15); bottom: 0; right: -80px; animation-delay:-4s; }
        .hero-content {
          position: relative; text-align: center;
          padding: var(--space-16) 0 var(--space-16);
          display: flex; flex-direction: column; align-items: center; gap: var(--space-6);
          z-index: 2;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 20px;
          background: rgba(14,165,233,0.2);
          border: 1px solid rgba(14,165,233,0.5);
          border-radius: var(--radius-full);
          font-size: 0.82rem; font-weight: 700; color: #93C5FD;
          backdrop-filter: blur(10px);
          animation: slideUp 0.6s ease;
        }
        .hero-title {
          font-size: clamp(2.2rem, 7vw, 5rem); font-weight: 900; line-height: 1.08;
          color: #FFFFFF; animation: slideUp 0.7s ease;
          text-shadow: 0 2px 20px rgba(0,0,0,0.4);
        }
        .hero-gradient-text {
          background: linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #34D399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          font-size: clamp(0.95rem, 2vw, 1.2rem);
          color: rgba(255,255,255,0.82);
          max-width: 580px; line-height: 1.7;
          animation: slideUp 0.8s ease;
        }
        .hero-search { width: 100%; max-width: 640px; animation: slideUp 0.9s ease; padding: 0 var(--space-4); }
        .hero-search-inner {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.3);
          border-radius: var(--radius-xl);
          padding: 6px 6px 6px 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          backdrop-filter: blur(16px);
          transition: var(--transition);
        }
        .hero-search-inner:focus-within {
          border-color: rgba(56,189,248,0.7);
          background: rgba(255,255,255,0.18);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 3px rgba(56,189,248,0.2);
        }
        .hero-search-icon { color: rgba(255,255,255,0.6); margin-right: 8px; flex-shrink: 0; }
        .hero-search-input {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-size: 0.98rem; min-width: 0;
        }
        .hero-search-input::placeholder { color: rgba(255,255,255,0.5); }
        .hero-search-btn { flex-shrink: 0; }
        .hero-stats {
          display: flex; align-items: center; gap: var(--space-5);
          animation: slideUp 1s ease;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-xl); padding: var(--space-3) var(--space-6);
          backdrop-filter: blur(16px);
        }
        .hero-stat { display: flex; flex-direction: column; align-items: center; }
        .hero-stat-value { font-size: 1.3rem; font-weight: 800; color: #fff; }
        .hero-stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.6); font-weight: 600; }
        .hero-stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.2); }
        .hero-trust {
          display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; justify-content: center;
          animation: slideUp 1.1s ease;
        }
        .trust-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; color: rgba(255,255,255,0.7); font-weight: 600;
        }
        .scroll-indicator {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center;
          animation: fadeIn 2s ease 1.5s both;
        }
        .scroll-dot {
          width: 24px; height: 40px;
          border: 2px solid rgba(255,255,255,0.4);
          border-radius: 12px; position: relative;
        }
        .scroll-dot::after {
          content: '';
          position: absolute; top: 5px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 8px; background: rgba(255,255,255,0.7);
          border-radius: 2px;
          animation: scrollBounce 1.8s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { top: 5px; opacity: 1; }
          80%       { top: 22px; opacity: 0; }
        }

        /* ── Categories ── */
        .categories-section { background: var(--bg-surface); }
        .section-title { font-size: clamp(1.4rem, 3vw, 2.1rem); font-weight: 800; color: var(--text-primary); }
        .section-subtitle { margin-top: var(--space-2); margin-bottom: var(--space-6); }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: var(--space-3);
          margin-top: var(--space-6);
        }
        .category-card {
          display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
          padding: var(--space-5);
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: var(--radius-lg); transition: var(--transition);
          cursor: pointer; box-shadow: var(--shadow-sm);
        }
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }
        .category-icon {
          width: 52px; height: 52px; border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          transition: var(--transition);
        }
        .category-card:hover .category-icon { transform: scale(1.1); }
        .category-name { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); text-align: center; }
        .category-card:hover .category-name { color: var(--text-primary); }

        /* ── How It Works ── */
        .how-section { background: var(--bg-surface); }
        .how-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
        .how-card {
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: var(--radius-xl); padding: var(--space-8);
          text-align: center; position: relative; overflow: hidden;
          transition: var(--transition); box-shadow: var(--shadow-sm);
        }
        .how-card:hover { border-color: var(--border-hover); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .how-step {
          position: absolute; top: var(--space-4); right: var(--space-5);
          font-size: 3rem; font-weight: 900;
          color: var(--border); line-height: 1;
        }
        .how-icon-wrap {
          width: 64px; height: 64px; border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto var(--space-4);
        }
        .how-title { font-size: 1.05rem; font-weight: 700; margin-bottom: var(--space-2); color: var(--text-primary); }
        .how-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.7; }

        /* ── CTA ── */
        .cta-section {
          position: relative; padding: var(--space-16) 0;
          overflow: hidden;
          background: linear-gradient(135deg, #0B1535 0%, #0F2347 50%, #0B1535 100%);
        }
        .cta-bg {
          position: absolute; inset: 0;
          background-image: url('/hero-bg.jpg');
          background-size: cover; background-position: center;
          opacity: 0.08;
        }
        .cta-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-content {
          position: relative; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: var(--space-5);
          z-index: 2;
        }
        .cta-badge {
          display: inline-block; padding: 6px 16px;
          background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3);
          border-radius: var(--radius-full); font-size: 0.82rem; font-weight: 700; color: #93C5FD;
        }
        .cta-title { font-size: clamp(1.8rem, 4.5vw, 3.2rem); font-weight: 900; color: #fff; }
        .cta-subtitle { color: rgba(255,255,255,0.75); font-size: 1.05rem; max-width: 500px; }
        .cta-buttons { display: flex; flex-direction: column; gap: var(--space-3); width: 100%; max-width: 320px; }
        .cta-btn-primary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 15px 32px; border-radius: var(--radius-xl);
          background: linear-gradient(135deg, #38BDF8, #0EA5E9);
          color: #fff; font-weight: 700; font-size: 1rem;
          transition: var(--transition); border: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(14,165,233,0.4);
        }
        .cta-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(14,165,233,0.5); filter: brightness(1.08); }
        .cta-btn-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 15px 32px; border-radius: var(--radius-xl);
          background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.3);
          color: #fff; font-weight: 600; font-size: 1rem;
          transition: var(--transition); cursor: pointer; backdrop-filter: blur(10px);
        }
        .cta-btn-ghost:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.5); transform: translateY(-2px); }

        /* ── Responsive ── */
        @media (min-width: 480px) {
          .cta-buttons { flex-direction: row; max-width: none; justify-content: center; }
          .cta-btn-primary, .cta-btn-ghost { width: auto; }
        }
        @media (min-width: 768px) {
          .hero { padding-top: 72px; }
          .hero-search { padding: 0; }
          .how-grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
        }
        @media (max-width: 479px) {
          .hero-title { font-size: clamp(1.7rem, 8vw, 2.5rem); }
          .hero-content { gap: var(--space-4); padding: var(--space-10) 0; }
          .hero-search { padding: 0 var(--space-2); }
          .hero-search-inner {
            display: grid;
            grid-template-columns: auto 1fr;
            padding: var(--space-3);
            gap: var(--space-2);
            border-radius: var(--radius-lg);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(16px);
          }
          .hero-search-icon {
            grid-column: 1;
            grid-row: 1;
            align-self: center;
            margin-right: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hero-search-input {
            grid-column: 2;
            grid-row: 1;
            width: 100%;
          }
          .hero-search-btn {
            grid-column: 1 / span 2;
            grid-row: 2;
            width: 100%;
            padding: 11px 20px;
            font-size: 0.9rem;
          }
          .hero-stats { gap: var(--space-3); padding: var(--space-2) var(--space-4); flex-wrap: wrap; justify-content: center; }
          .hero-stat-value { font-size: 1rem; }
          .hero-trust { gap: var(--space-2); }
          .trust-item { font-size: 0.72rem; }
          .categories-grid { gap: var(--space-2); }
          .category-card { padding: var(--space-3); }
          .category-icon { width: 40px; height: 40px; }
          .category-name { font-size: 0.72rem; }
          .cta-section { padding: var(--space-10) 0; }
          .cta-title { font-size: clamp(1.5rem, 6vw, 2rem); }
          .cta-buttons { width: 100%; max-width: 280px; }
          .cta-btn-primary, .cta-btn-ghost { padding: 13px 20px; font-size: 0.9rem; }
        }
      `}</style>
    </div>
  );
};

export default Home;
