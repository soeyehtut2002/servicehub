/**
 * ChatPage.jsx
 * Full-screen Grab/Bolt-style messenger UI.
 * Routes: /chat  →  shows conversation list
 *         /chat/:userId  →  opens specific conversation
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { BASE_URL } from '../config';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const fmtFull = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

// ── Main component ────────────────────────────────────────────────────────────
const ChatPage = () => {
  const { userId: paramUserId } = useParams();          // active partner id
  const activePartnerId = paramUserId ? parseInt(paramUserId) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveMessages, sendMessage, markRead, isOnline, unreadCount } = useSocket();

  const [conversations, setConversations]   = useState([]);
  const [messages,      setMessages]        = useState([]);   // historical messages
  const [partner,       setPartner]         = useState(null); // partner profile
  const [text,          setText]            = useState('');
  const [convLoading,   setConvLoading]     = useState(true);
  const [msgLoading,    setMsgLoading]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]     = useState(true);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const textareaRef = useRef(null);

  // ── Fetch conversation list ─────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await API.get('/messages/conversations');
      setConversations(res.data);
    } catch { /* silent */ }
    finally { setConvLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations, unreadCount]);

  // ── Lock body scrolling for app-like chat experience ───────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Fetch message history when partner changes ──────────────────────────────
  useEffect(() => {
    if (!activePartnerId) {
      setMessages([]);
      setPartner(null);
      return;
    }
    const load = async () => {
      setMsgLoading(true);
      try {
        const [msgRes, profileRes] = await Promise.all([
          API.get(`/messages/${activePartnerId}`),
          API.get(`/profile/${activePartnerId}`),
        ]);
        setMessages(msgRes.data);
        setPartner(profileRes.data);
        markRead(activePartnerId);
      } catch (err) {
        toast.error('Failed to load conversation');
      } finally {
        setMsgLoading(false);
        inputRef.current?.focus?.();
      }
    };
    load();
  }, [activePartnerId]);

  // ── Merge live messages into display list ───────────────────────────────────
  const liveMsgs = activePartnerId ? (liveMessages[activePartnerId] || []) : [];
  const allMessages = [
    ...messages,
    ...liveMsgs.filter(lm => !messages.find(m => m.id === lm.id)),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  // ── Auto-mark as read when new messages arrive ──────────────────────────────
  useEffect(() => {
    if (activePartnerId && liveMsgs.length) {
      markRead(activePartnerId);
    }
  }, [liveMsgs.length]);

  // ── Auto-adjust input textarea height based on content ──────────────────────
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [text]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const content = text.trim();
    if (!content || !activePartnerId) return;
    sendMessage(activePartnerId, content);
    setText('');
    textareaRef.current?.focus?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Group messages by date ───────────────────────────────────────────────────
  const groupedMessages = allMessages.reduce((groups, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const partnerAvatar = partner?.avatar_url
    ? (partner.avatar_url.startsWith('http') ? partner.avatar_url : `${BASE_URL}${partner.avatar_url}`)
    : null;

  return (
    <div className={`chat-page ${activePartnerId ? 'active-chat' : 'list-chat'}`}>
      {/* ── Sidebar: Conversations ─────────────────────────────────── */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title">💬 Messages</h2>
          <button className="sidebar-toggle-btn hide-lg" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        {convLoading ? (
          <div className="spinner-container" style={{ minHeight: 100 }}><div className="spinner" /></div>
        ) : conversations.length === 0 ? (
          <div className="conv-empty">
            <span style={{ fontSize: '2.5rem' }}>💬</span>
            <p>No conversations yet</p>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Book a service and message the provider
            </p>
          </div>
        ) : (
          <ul className="conv-list">
            {conversations.map((conv) => {
              const isActive  = activePartnerId === conv.partner_id;
              const online    = isOnline(conv.partner_id);
              const hasUnread = parseInt(conv.unread) > 0;
              return (
                <li key={conv.partner_id}>
                  <button
                    className={`conv-item ${isActive ? 'active' : ''}`}
                    onClick={() => { navigate(`/chat/${conv.partner_id}`); setSidebarOpen(false); }}
                  >
                    <div className="conv-avatar-wrap">
                      {conv.partner_avatar
                        ? <img src={conv.partner_avatar.startsWith('http') ? conv.partner_avatar : `${BASE_URL}${conv.partner_avatar}`} alt="" className="conv-avatar-img" />
                        : <div className="conv-avatar-placeholder">{conv.partner_name?.[0]?.toUpperCase()}</div>
                      }
                      <span className={`online-dot ${online ? 'online' : 'offline'}`} />
                    </div>
                    <div className="conv-info">
                      <div className="conv-name-row">
                        <span className="conv-name">{conv.partner_name}</span>
                        <span className="conv-time">{fmtTime(conv.last_time)}</span>
                      </div>
                      <div className="conv-preview-row">
                        <span className="conv-preview">{conv.last_message}</span>
                        {hasUnread && <span className="conv-unread">{conv.unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Main: Chat Window ─────────────────────────────────────── */}
      <main className="chat-main">
        {!activePartnerId ? (
          /* Empty state */
          <div className="chat-empty-state">
            <div style={{ fontSize: '4rem' }}>💬</div>
            <h2>Your Messages</h2>
            <p>Select a conversation from the left, or start one by messaging a provider from a service page.</p>
            <button className="btn btn-ghost sidebar-open-btn hide-lg" onClick={() => setSidebarOpen(true)}>
              📋 View Conversations
            </button>
          </div>
        ) : (
          <>
            {/* ── Chat Header ─────────────────────────────────────── */}
            <div className="chat-header">
              <button className="back-btn hide-lg" onClick={() => { navigate('/chat'); setSidebarOpen(true); }}>←</button>
              <div className="chat-header-avatar-wrap">
                {partnerAvatar
                  ? <img src={partnerAvatar} alt="" className="chat-header-avatar" />
                  : <div className="chat-header-avatar placeholder">{partner?.name?.[0]?.toUpperCase() || '?'}</div>
                }
                <span className={`online-dot ${isOnline(activePartnerId) ? 'online' : 'offline'}`} />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{partner?.name || 'Loading…'}</div>
                <div className="chat-header-status">
                  {isOnline(activePartnerId) ? (
                    <span className="status-online">● Online</span>
                  ) : (
                    <span className="status-offline">● Offline</span>
                  )}
                  {partner?.role && <span className="header-role"> · {partner.role}</span>}
                </div>
              </div>
              {partner && (
                <Link to={`/profile/${activePartnerId}`} className="btn btn-ghost btn-sm chat-header-action">
                  View Profile
                </Link>
              )}
            </div>

            {/* ── Messages ────────────────────────────────────────── */}
            <div className="chat-messages-area">
              {msgLoading ? (
                <div className="spinner-container"><div className="spinner" /></div>
              ) : allMessages.length === 0 ? (
                <div className="chat-empty-conv">
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👋</div>
                  <p>Start the conversation!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, dayMsgs]) => (
                  <div key={dateKey}>
                    {/* Date divider */}
                    <div className="date-divider">
                      <span>{new Date(dateKey).toDateString() === new Date().toDateString() ? 'Today' : new Date(dateKey).toLocaleDateString([], { weekday:'long', month:'short', day:'numeric' })}</span>
                    </div>
                    {dayMsgs.map((msg, i) => {
                      const isMine   = msg.sender_id === user?.id;
                      const prevMsg  = i > 0 ? dayMsgs[i - 1] : null;
                      const isFirst  = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                      return (
                        <div key={msg.id || `live-${i}`} className={`msg-row ${isMine ? 'mine' : 'theirs'}`}>
                          {!isMine && isFirst && (
                            <div className="msg-avatar-col">
                              {partner?.avatar_url
                                ? <img src={partner.avatar_url.startsWith('http') ? partner.avatar_url : `${BASE_URL}${partner.avatar_url}`} alt="" className="msg-avatar" />
                                : <div className="msg-avatar placeholder">{partner?.name?.[0]?.toUpperCase()}</div>
                              }
                            </div>
                          )}
                          {!isMine && !isFirst && <div className="msg-avatar-spacer" />}
                          <div className="msg-bubble-wrap">
                            <div className={`msg-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                              {msg.content}
                            </div>
                            <div className={`msg-meta ${isMine ? 'meta-right' : 'meta-left'}`}>
                              {fmtFull(msg.created_at)}
                              {isMine && <span className="read-tick">{msg.is_read ? ' ✓✓' : ' ✓'}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input ───────────────────────────────────────────── */}
            <div className="chat-input-area">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Type a message…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!text.trim()}
                title="Send message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        )}
      </main>

      <style>{`
        /* ── Layout ─────────────────────────────────────────────────────── */
        .chat-page {
          display: flex;
          height: calc(100vh - 72px);
          height: calc(100dvh - 72px);
          margin-top: 72px;
          background: var(--bg-base);
          overflow: hidden;
        }

        /* ── Sidebar ────────────────────────────────────────────────────── */
        .chat-sidebar {
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          transition: var(--transition);
          overflow: hidden;
        }
        .chat-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5) var(--space-5) var(--space-4);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .chat-sidebar-title { font-size: 1.1rem; font-weight: 800; }
        .sidebar-toggle-btn { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem; }

        /* Conversations */
        .conv-list { flex:1; overflow-y:auto; list-style:none; margin:0; padding:var(--space-2) 0; }
        .conv-item {
          display: flex; align-items: center; gap: var(--space-3);
          width: 100%; padding: var(--space-3) var(--space-4);
          background: none; border: none; cursor: pointer; text-align: left;
          transition: var(--transition);
        }
        .conv-item:hover { background: rgba(255,255,255,.05); }
        .conv-item.active { background: rgba(108,99,255,.15); }
        .conv-avatar-wrap { position:relative; flex-shrink:0; }
        .conv-avatar-img { width:44px; height:44px; border-radius:50%; object-fit:cover; }
        .conv-avatar-placeholder { width:44px; height:44px; border-radius:50%; background:var(--gradient-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1rem; color:#fff; }
        .conv-info { flex:1; min-width:0; }
        .conv-name-row { display:flex; justify-content:space-between; align-items:center; gap:var(--space-2); }
        .conv-name { font-weight:700; font-size:.9rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .conv-time { font-size:.72rem; color:var(--text-muted); flex-shrink:0; }
        .conv-preview-row { display:flex; justify-content:space-between; align-items:center; margin-top:2px; }
        .conv-preview { flex:1; min-width:0; font-size:.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-right:var(--space-2); }
        .conv-unread { background:var(--primary); color:#fff; font-size:.7rem; font-weight:700; border-radius:10px; padding:1px 7px; flex-shrink:0; }
        .conv-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:var(--space-2); color:var(--text-muted); padding:var(--space-8); text-align:center; }

        /* ── Online dot ─────────────────────────────────────────────────── */
        .online-dot {
          position:absolute; bottom:1px; right:1px;
          width:11px; height:11px; border-radius:50%;
          border:2px solid var(--bg-card);
        }
        .online-dot.online  { background:#00D4AA; box-shadow:0 0 6px #00D4AA; }
        .online-dot.offline { background:var(--border); }

        /* ── Chat Main ──────────────────────────────────────────────────── */
        .chat-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        /* Empty state */
        .chat-empty-state {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:var(--space-4); color:var(--text-secondary); text-align:center; padding:var(--space-8);
        }
        .chat-empty-state h2 { font-size:1.5rem; font-weight:800; color:var(--text-primary); }

        /* Header */
        .chat-header {
          display:flex; align-items:center; gap:var(--space-3);
          padding:var(--space-4) var(--space-5);
          border-bottom:1px solid var(--border);
          background:var(--bg-card);
          flex-shrink:0;
        }
        .back-btn { background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem; padding:4px 8px; border-radius:var(--radius-md); transition:var(--transition); }
        .back-btn:hover { background:rgba(255,255,255,.06); }
        .chat-header-avatar-wrap { position:relative; flex-shrink:0; }
        .chat-header-avatar { width:42px; height:42px; border-radius:50%; object-fit:cover; }
        .chat-header-avatar.placeholder { background:var(--gradient-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; color:#fff; }
        .chat-header-info { flex:1; }
        .chat-header-name { font-weight:800; font-size:1rem; }
        .chat-header-status { font-size:.78rem; margin-top:2px; }
        .status-online  { color:#00D4AA; }
        .status-offline { color:var(--text-muted); }
        .header-role { color:var(--text-muted); }
        .chat-header-action { margin-left:auto; }

        /* Messages area */
        .chat-messages-area {
          flex:1; overflow-y:auto; padding:var(--space-5) var(--space-5) var(--space-2);
          display:flex; flex-direction:column; gap:2px;
          scroll-behavior: smooth;
        }
        .chat-empty-conv { text-align:center; margin:auto; color:var(--text-muted); }

        /* Date divider */
        .date-divider {
          display:flex; align-items:center; gap:var(--space-3);
          margin:var(--space-4) 0 var(--space-2);
          color:var(--text-muted); font-size:.75rem; font-weight:600;
        }
        .date-divider::before, .date-divider::after { content:''; flex:1; height:1px; background:var(--border); }

        /* Message rows */
        .msg-row { display:flex; align-items:flex-end; gap:var(--space-2); margin-bottom:var(--space-1); }
        .msg-row.mine { flex-direction:row-reverse; }
        .msg-avatar-col { flex-shrink:0; }
        .msg-avatar { width:30px; height:30px; border-radius:50%; object-fit:cover; }
        .msg-avatar.placeholder { background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:#fff; }
        .msg-avatar-spacer { width:30px; flex-shrink:0; }
        .msg-bubble-wrap { display:flex; flex-direction:column; max-width:70%; }
        .msg-bubble {
          padding:10px 14px; border-radius:18px; font-size:.9rem; line-height:1.5;
          word-break:break-word; white-space:pre-wrap;
        }
        .bubble-mine {
          background:var(--gradient-primary);
          color:#fff;
          border-bottom-right-radius:4px;
          box-shadow:0 2px 12px rgba(108,99,255,.3);
        }
        .bubble-theirs {
          background:rgba(255,255,255,.08);
          border:1px solid var(--border);
          color:var(--text-primary);
          border-bottom-left-radius:4px;
        }
        .msg-meta { font-size:.68rem; color:var(--text-muted); margin-top:3px; }
        .meta-right { text-align:right; }
        .meta-left  { text-align:left; }
        .read-tick  { color:var(--primary-light); }

        /* Input area */
        .chat-input-area {
          display:flex; align-items:flex-end; gap:var(--space-3);
          padding:var(--space-4) var(--space-5);
          border-top:1px solid var(--border);
          background:var(--bg-card);
          flex-shrink:0;
        }
        .chat-input {
          flex:1; background:rgba(255,255,255,.06); border:1px solid var(--border);
          border-radius:20px; color:var(--text-primary); font-size:.9rem;
          padding:10px 18px; outline:none; resize:none; max-height:120px;
          font-family:inherit; transition:var(--transition); line-height:1.5;
          scrollbar-width:none;
        }
        .chat-input::-webkit-scrollbar { display:none; }
        .chat-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-glow); background:rgba(255,255,255,.09); }
        .chat-input::placeholder { color:var(--text-muted); }
        .chat-send-btn {
          width:44px; height:44px; border-radius:50%; flex-shrink:0;
          background:var(--gradient-primary); border:none; color:#fff;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:var(--transition);
          box-shadow:0 2px 12px rgba(108,99,255,.4);
        }
        .chat-send-btn:hover:not(:disabled) { transform:scale(1.08); box-shadow:0 4px 20px rgba(108,99,255,.5); }
        .chat-send-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; }

        /* ── Responsive ─────────────────────────────────────────────────── */
        .hide-lg { display:none; }
        @media(max-width:768px){
          .hide-lg { display:flex; }
          .chat-page { 
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            height: auto;
            margin-top: 0;
          }
          
          /* Mobile Conversions List View */
          .chat-page.list-chat .chat-sidebar {
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
            position: static !important;
            box-shadow: none !important;
            display: flex !important;
          }
          .chat-page.list-chat .chat-main {
            display: none !important;
          }

          /* Mobile Active Chat View */
          .chat-page.active-chat .chat-sidebar {
            display: none !important;
          }
          .chat-page.active-chat .chat-main {
            display: flex !important;
            width: 100% !important;
          }

          .msg-bubble-wrap { max-width: calc(100% - 48px); }
          .chat-header-action { display: none; }
          .sidebar-open-btn { margin-top: var(--space-2); }
          .chat-input { font-size: 16px !important; }
        }
        @media(max-width:480px){
          .chat-header { padding: var(--space-3) var(--space-4); gap: var(--space-2); }
          .msg-bubble { font-size: 0.85rem; padding: 8px 12px; }
          .chat-messages-area { padding: var(--space-3); }
          .chat-input-area { padding: var(--space-3); gap: var(--space-2); }
          .chat-input { font-size: 16px !important; padding: 8px 14px; }
          .chat-send-btn { width: 40px; height: 40px; }
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
