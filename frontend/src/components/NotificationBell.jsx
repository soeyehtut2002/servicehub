import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { Bell, BellOff, Calendar, CheckCircle, XCircle, RefreshCw, Flag, MessageSquare } from 'lucide-react';

function getNotifIcon(type) {
  const p = { size: 16, strokeWidth: 2 };
  const map = {
    booking_new:       <Calendar    {...p} color="#6366F1" />,
    booking_confirmed: <CheckCircle {...p} color="#10B981" />,
    booking_cancelled: <XCircle     {...p} color="#EF4444" />,
    booking_status:    <RefreshCw   {...p} color="#F59E0B" />,
    booking_completed: <Flag        {...p} color="#10B981" />,
    new_message:       <MessageSquare {...p} color="#6366F1" />,
  };
  return map[type] || <Bell {...p} color="#94A3B8" />;
}

// Notification types that should navigate somewhere when clicked
const BOOKING_TYPES = new Set([
  'booking_new', 'booking_confirmed', 'booking_cancelled',
  'booking_status', 'booking_completed',
]);

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Returns the target path for a notification, or null if there is none. */
function getDestination(n, userRole) {
  const type = n.type || '';
  const data = n.data || {};

  // Chat / message notifications → open the specific conversation
  if (type === 'new_message') {
    return data.sender_id ? `/chat/${data.sender_id}` : '/chat';
  }

  // Booking-related → route to the correct role dashboard
  if (BOOKING_TYPES.has(type) || data.booking_id) {
    if (userRole === 'provider') return '/dashboard/provider';
    if (userRole === 'admin')    return '/dashboard/admin';
    return '/dashboard/customer';
  }

  // Service detail (fallback when only service_id is present)
  if (data.service_id) return `/services/${data.service_id}`;

  return null;
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const dropRef  = useRef(null);
  const navigate = useNavigate();

  // Pull notificationTrigger from socket context
  const { notificationTrigger } = useSocket() || {};

  // ── Get current user role for smart routing ───────────────────────────────
  let userRole = 'customer';
  try {
    const stored = localStorage.getItem('user');
    if (stored) userRole = JSON.parse(stored)?.role || 'customer';
  } catch { /* ignore */ }

  // ── Initial unread count ──────────────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    try {
      const r = await API.get('/notifications/unread-count');
      setUnread(Number(r.data.count) || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  // ── React to real-time notifications from SocketContext ───────────────────
  useEffect(() => {
    if (!notificationTrigger) return;
    setUnread(c => c + 1);
    setNotifications(prev => [notificationTrigger, ...prev.slice(0, 49)]);
  }, [notificationTrigger]);

  // ── Fetch full list when dropdown opens ──────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get('/notifications?limit=20');
      setNotifications(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = () => {
    if (!open) fetchList();
    setOpen(o => !o);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(c => Math.max(0, c - 1));
    try { await API.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const markAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    try { await API.patch('/notifications/read-all'); } catch { /* ignore */ }
  };

  // ── Click a notification: mark read + navigate ────────────────────────────
  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    const dest = getDestination(n, userRole);
    if (dest) navigate(dest);
    setOpen(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="nb-wrapper" ref={dropRef}>
      <button className="nb-btn" onClick={toggleOpen} aria-label="Notifications">
        <span className="nb-icon"><Bell size={20} strokeWidth={2} /></span>
        {unread > 0 && (
          <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <span className="nb-title" style={{display:'flex',alignItems:'center',gap:6}}><Bell size={14} strokeWidth={2}/>Notifications</span>
            {unread > 0 && (
              <button className="nb-mark-all" onClick={markAll}>Mark all read</button>
            )}
          </div>

          <div className="nb-list">
            {loading ? (
              <div className="nb-empty"><div className="spinner" style={{width:24,height:24}}/></div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">
                <div style={{marginBottom:8,opacity:0.4}}><BellOff size={32} strokeWidth={1.5}/></div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const dest = getDestination(n, userRole);
                return (
                  <div
                    key={n.id}
                    className={`nb-item${n.is_read ? '' : ' nb-unread'}${dest ? ' nb-clickable' : ''}`}
                    onClick={() => handleClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                    title={dest ? 'Click to view' : undefined}
                  >
                    <div className="nb-item-icon">
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="nb-item-body">
                      <div className="nb-item-title">{n.title}</div>
                      <div className="nb-item-msg">{n.message}</div>
                      <div className="nb-item-time">{timeAgo(n.created_at)}</div>
                    </div>
                    <div className="nb-item-right">
                      {!n.is_read && <div className="nb-dot" />}
                      {dest && <span className="nb-arrow">›</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        .nb-wrapper{position:relative;display:inline-flex;align-items:center}
        .nb-btn{position:relative;background:transparent;border:none;cursor:pointer;padding:8px;border-radius:50%;transition:background .2s;display:flex;align-items:center}
        .nb-btn:hover{background:rgba(255,255,255,.08)}
        .nb-icon{font-size:1.25rem;line-height:1}
        .nb-badge{position:absolute;top:2px;right:2px;min-width:18px;height:18px;background:#FF4757;color:#fff;font-size:.62rem;font-weight:700;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--bg-base,#0f0e17)}
        .nb-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:340px;max-height:480px;display:flex;flex-direction:column;background:var(--bg-card,#1a1830);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:var(--radius-lg,12px);box-shadow:0 20px 60px rgba(0,0,0,.55);z-index:9999;overflow:hidden;animation:nb-slide .15s ease}
        @keyframes nb-slide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .nb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.1))}
        .nb-title{font-weight:700;font-size:.88rem;color:var(--text-primary,#fffffe)}
        .nb-mark-all{background:none;border:none;cursor:pointer;font-size:.74rem;color:var(--primary,#6c63ff);font-weight:600}
        .nb-mark-all:hover{text-decoration:underline}
        .nb-list{overflow-y:auto;flex:1}
        .nb-empty{padding:36px 16px;text-align:center;color:var(--text-muted,#a89ec9);font-size:.84rem}
        .nb-item{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;cursor:default;transition:background .15s;border-bottom:1px solid rgba(255,255,255,.04);position:relative}
        .nb-clickable{cursor:pointer}
        .nb-clickable:hover{background:rgba(255,255,255,.06)}
        .nb-unread{background:rgba(108,99,255,.07)}
        .nb-item-icon{font-size:1.35rem;flex-shrink:0;margin-top:2px}
        .nb-item-body{flex:1;min-width:0}
        .nb-item-title{font-size:.82rem;font-weight:700;color:var(--text-primary,#fffffe);margin-bottom:2px}
        .nb-item-msg{font-size:.74rem;color:var(--text-secondary,#a89ec9);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .nb-item-time{font-size:.67rem;color:var(--text-muted,#6b6585);margin-top:4px}
        .nb-item-right{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;margin-top:4px}
        .nb-dot{width:8px;height:8px;border-radius:50%;background:#6c63ff}
        .nb-arrow{font-size:1.1rem;color:var(--text-muted,#6b6585);line-height:1;transition:color .15s}
        .nb-clickable:hover .nb-arrow{color:var(--primary,#6c63ff)}
        @media(max-width:480px){
          .nb-dropdown {
            position: fixed;
            top: 68px;
            left: 12px;
            right: 12px;
            width: auto;
            max-height: 75vh;
          }
        }
      `}</style>
    </div>
  );
}
