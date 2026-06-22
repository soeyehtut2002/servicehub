import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import SearchAutocomplete from './SearchAutocomplete';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';
import { LayoutDashboard, User, MessageSquare, Plus, LogOut, ChevronDown, ChevronUp, Sun, Moon, Globe, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount }  = useSocket() || {};
  const { theme, toggleTheme } = useTheme();
  const { lang, changeLang, t, languages } = useLang();
  const navigate = useNavigate();
  const [scrolled,       setScrolled]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [langOpen,       setLangOpen]       = useState(false);
  const userMenuRef = useRef(null);
  const langRef     = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (langRef.current    && !langRef.current.contains(e.target))     setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 769) setMobileMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return null;
    const paths = { customer: '/dashboard/customer', provider: '/dashboard/provider', admin: '/dashboard/admin' };
    return paths[user.role] || '/';
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const currentLang = languages.find(l => l.code === lang);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo.png" alt="ServiceHub" className="logo-img" />
          <span className="logo-text">Service<span className="gradient-text">Hub</span></span>
        </Link>

        {/* Search — desktop */}
        <div className="navbar-search nb-desktop">
          <SearchAutocomplete placeholder={t('nav_search_ph')} />
        </div>

        {/* Nav Links — desktop */}
        <div className="navbar-links nb-desktop">
          <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {t('nav_services')}
          </NavLink>
          {user && (
            <NavLink to={getDashboardLink()} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav_dashboard')}
            </NavLink>
          )}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button className="theme-toggle nb-hide-sm" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
            {theme === 'dark' ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
          </button>

          {/* Language Selector */}
          <div className="lang-selector nb-hide-sm" ref={langRef}>
            <button className="lang-btn" onClick={() => setLangOpen(o => !o)}>
              <Globe size={14} strokeWidth={2} />
              <span>{currentLang?.flag}</span>
              <span className="nb-desktop">{currentLang?.label}</span>
            </button>
            {langOpen && (
              <div className="lang-dropdown">
                {languages.map(l => (
                  <button
                    key={l.code}
                    className={`lang-option ${lang === l.code ? 'active' : ''}`}
                    onClick={() => { changeLang(l.code); setLangOpen(false); }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <Link to="/chat" className="chat-nav-btn" title={t('nav_messages')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="chat-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </Link>
          )}
          {user && <NotificationBell />}

          {/* Desktop: User dropdown */}
          {user ? (
            <div className="user-menu nb-desktop" ref={userMenuRef}>
              <button className="user-trigger" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <div className="avatar avatar-sm">{getInitials(user.name)}</div>
                <span className="user-name">{user.name.split(' ')[0]}</span>
                <span className="chevron">{userMenuOpen ? <ChevronUp size={13} strokeWidth={2.5}/> : <ChevronDown size={13} strokeWidth={2.5}/>}</span>
              </button>
              {userMenuOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="avatar avatar-lg">{getInitials(user.name)}</div>
                    <div>
                      <p className="dropdown-name">{user.name}</p>
                      <p className="dropdown-role">{user.role}</p>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <Link to={getDashboardLink()} className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <LayoutDashboard size={15} strokeWidth={2}/> {t('nav_dashboard')}
                  </Link>
                  <Link to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <User size={15} strokeWidth={2}/> {t('nav_profile')}
                  </Link>
                  <Link to="/chat" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <MessageSquare size={15} strokeWidth={2}/> {t('nav_messages')} {unreadCount > 0 && <span style={{background:'var(--primary)',color:'#fff',borderRadius:'10px',fontSize:'.7rem',padding:'1px 6px',marginLeft:'auto'}}>{unreadCount}</span>}
                  </Link>
                  {user.role === 'provider' && (
                    <Link to="/dashboard/provider" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <Plus size={15} strokeWidth={2}/> {t('nav_myservices')}
                    </Link>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} strokeWidth={2}/> {t('nav_signout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons nb-desktop">
              <Link to="/login" className="btn btn-ghost btn-sm">{t('nav_signin')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('nav_getstarted')}</Link>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-inner">
          <div className="mobile-search">
            <SearchAutocomplete placeholder={t('nav_search_ph')} onClose={() => setMobileMenuOpen(false)} />
          </div>
          <Link to="/services" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>{t('nav_services')}</Link>
          {user ? (
            <>
              <Link to={getDashboardLink()} className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <LayoutDashboard size={16} strokeWidth={2}/> {t('nav_dashboard')}
              </Link>
              <Link to="/profile" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <User size={16} strokeWidth={2}/> {t('nav_profile')}
              </Link>
              {user.role === 'provider' && (
                <Link to="/dashboard/provider" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  <Plus size={16} strokeWidth={2}/> {t('nav_myservices')}
                </Link>
              )}
              <div className="mobile-divider" />
              <div className="mobile-user-info">
                <div className="avatar" style={{width:36,height:36,fontSize:'0.85rem',flexShrink:0}}>{getInitials(user.name)}</div>
                <div style={{minWidth:0}}>
                  <p style={{fontWeight:700,fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</p>
                  <p style={{fontSize:'0.75rem',color:'var(--text-muted)',textTransform:'capitalize'}}>{user.role}</p>
                </div>
              </div>
              <button className="mobile-link danger-link" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={2}/> {t('nav_signout')}
              </button>
            </>
          ) : (
            <div className="mobile-auth-buttons">
              <Link to="/login" className="btn btn-ghost w-full" onClick={() => setMobileMenuOpen(false)}>{t('nav_signin')}</Link>
              <Link to="/register" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>{t('nav_getstarted')}</Link>
            </div>
          )}
          
          <div className="mobile-divider" />
          
          {/* Mobile Settings Control Row (Theme Toggle & Language selector) */}
          <div className="mobile-menu-controls">
            <button className="mobile-control-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <div className="mobile-lang-list">
              {languages.map(l => (
                <button
                  key={l.code}
                  className={`mobile-lang-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => changeLang(l.code)}
                >
                  <span>{l.flag}</span>
                  <span style={{ fontSize: '.75rem', fontWeight: 700 }}>{l.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: var(--z-nav); padding: 0 var(--space-4); height: 64px;
          transition: var(--transition-slow);
          background: var(--bg-glass); backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid transparent;
        }
        .navbar-scrolled { background: var(--bg-glass); border-bottom-color: var(--border); box-shadow: 0 2px 16px rgba(14,165,233,0.1); }
        .navbar-inner { display: flex; align-items: center; gap: var(--space-3); height: 100%; max-width: 1200px; margin: 0 auto; }
        .navbar-logo { display: flex; align-items: center; gap: var(--space-2); font-size: 1.2rem; font-weight: 800; white-space: nowrap; flex-shrink: 0; color: var(--text-primary); }
        .logo-img { width: 28px; height: 28px; object-fit: contain; filter: drop-shadow(0 0 6px rgba(14,165,233,0.4)); }
        .logo-text { font-family: 'Plus Jakarta Sans', sans-serif; }
        .navbar-search { flex: 1; max-width: 340px; position: relative; }
        .navbar-links { display: flex; align-items: center; gap: 2px; }
        .nav-link { padding: 7px 13px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); transition: var(--transition); }
        .nav-link:hover { color: var(--primary-dark); background: var(--primary-glow); }
        .nav-link.active { color: var(--primary-dark); background: rgba(14,165,233,0.12); }
        .navbar-actions { display: flex; align-items: center; gap: var(--space-2); margin-left: auto; }
        .auth-buttons { display: flex; gap: var(--space-2); }
        .chat-nav-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1.5px solid var(--border); color: var(--text-secondary); transition: var(--transition); }
        .chat-nav-btn:hover { background: var(--primary-glow); border-color: var(--primary); color: var(--primary-dark); }
        .chat-badge { position: absolute; top: -5px; right: -5px; background: var(--danger); color: #fff; font-size: .62rem; font-weight: 700; border-radius: 10px; padding: 1px 5px; border: 2px solid var(--bg-card); min-width: 18px; text-align: center; }
        .user-menu { position: relative; }
        .user-trigger { display: flex; align-items: center; gap: var(--space-2); background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-full); padding: 4px 12px 4px 4px; color: var(--text-primary); cursor: pointer; transition: var(--transition); box-shadow: var(--shadow-sm); }
        .user-trigger:hover { border-color: var(--primary); background: var(--bg-surface); box-shadow: 0 0 0 3px var(--primary-glow); }
        .avatar-sm { width: 30px; height: 30px; font-size: 0.72rem; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .chevron { display:flex; align-items:center; color: var(--text-muted); }
        .dropdown-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 230px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden; animation: slideUp 0.15s ease; z-index: 10; }
        .dropdown-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); background: var(--bg-surface); border-bottom: 1px solid var(--border); }
        .avatar-lg { width: 40px; height: 40px; font-size: 0.9rem; }
        .dropdown-name { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }
        .dropdown-role { font-size: 0.72rem; text-transform: capitalize; background: rgba(14,165,233,0.12); color: var(--primary-dark); padding: 2px 8px; border-radius: var(--radius-full); display: inline-block; margin-top: 2px; font-weight: 600; }
        .dropdown-divider { height: 1px; background: var(--border); }
        .dropdown-item { display: flex; align-items: center; gap: var(--space-2); padding: 11px 16px; font-size: 0.875rem; color: var(--text-secondary); transition: var(--transition); cursor: pointer; background: none; border: none; width: 100%; text-align: left; }
        .dropdown-item:hover { background: var(--bg-surface); color: var(--primary-dark); }
        .dropdown-item.danger:hover { background: rgba(239,68,68,0.08); color: var(--danger); }

        /* Hamburger */
        .hamburger { display: none; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-surface); border: 1.5px solid var(--border); border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer; transition: var(--transition); flex-shrink: 0; }
        .hamburger:hover { background: var(--primary-glow); border-color: var(--primary); color: var(--primary); }

        /* Mobile overlay */
        .mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: calc(var(--z-nav) - 1); animation: fadeIn 0.2s ease; }

        /* Mobile Menu */
        .mobile-menu { position: fixed; top: 64px; left: 0; right: 0; background: var(--bg-card); border-bottom: 1.5px solid var(--border); box-shadow: 0 8px 32px rgba(14,165,233,0.15); z-index: calc(var(--z-nav) - 1); transform: translateY(-110%); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), visibility 0.28s; max-height: calc(100vh - 64px); overflow-y: auto; -webkit-overflow-scrolling: touch; visibility: hidden; pointer-events: none; }
        .mobile-menu.mobile-menu-open { transform: translateY(0); visibility: visible; pointer-events: auto; }
        .mobile-menu-inner { display: flex; flex-direction: column; padding: var(--space-4); gap: var(--space-1); }
        .mobile-search { margin-bottom: var(--space-3); }
        .mobile-link { display: flex; align-items: center; gap: var(--space-3); padding: 13px var(--space-4); border-radius: var(--radius-md); font-size: 0.95rem; font-weight: 600; color: var(--text-secondary); transition: var(--transition); background: none; border: none; text-align: left; cursor: pointer; text-decoration: none; min-height: 48px; }
        .mobile-link:hover, .mobile-link:active { background: var(--bg-surface); color: var(--primary-dark); }
        .danger-link { color: var(--danger); }
        .danger-link:hover { background: rgba(239,68,68,0.08); color: var(--danger); }
        .mobile-divider { height: 1px; background: var(--border); margin: var(--space-2) 0; }
        .mobile-user-info { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md); margin-bottom: var(--space-1); }
        .mobile-auth-buttons { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3) 0; }
        
        .mobile-menu-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px var(--space-4);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          margin-top: var(--space-2);
          gap: var(--space-2);
        }
        .mobile-control-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          transition: var(--transition);
        }
        .mobile-control-btn:hover {
          background: var(--bg-surface);
          color: var(--primary-dark);
        }
        .mobile-lang-list {
          display: flex;
          gap: var(--space-1);
        }
        .mobile-lang-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .mobile-lang-btn.active {
          background: rgba(14, 165, 233, 0.12);
          border-color: var(--primary);
          color: var(--primary-dark);
        }

        @media (min-width: 769px) {
          .navbar { padding: 0 var(--space-6); height: 72px; }
          .hamburger { display: none !important; }
          .mobile-menu, .mobile-overlay { display: none !important; }
          .nb-desktop { display: flex !important; }
        }
        @media (max-width: 768px) {
          .hamburger { display: flex; }
          .nb-desktop { display: none !important; }
          .navbar-actions { gap: var(--space-1); }
          .chat-nav-btn { width: 36px; height: 36px; }
          .theme-toggle { width: 36px; height: 36px; }
          .lang-btn { padding: 5px 8px; }
        }
        @media (max-width: 576px) {
          .nb-hide-sm { display: none !important; }
        }
        @media (max-width: 360px) {
          .logo-text { display: none; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
