/**
 * SocketContext.jsx
 * Manages a single persistent Socket.io connection for the entire app.
 * Provides: socket instance, online users list, unread message count.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API from '../api/axios';

const SocketContext = createContext(null);

const SOCKET_URL = 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user }  = useAuth();
  const socketRef = useRef(null);

  const [onlineUsers,       setOnlineUsers]       = useState([]);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [liveMessages,      setLiveMessages]      = useState({});
  // Fires whenever a new in-app notification arrives via socket
  const [notificationTrigger, setNotificationTrigger] = useState(null);

  // ── Connect / disconnect whenever auth changes ───────────────────────────────
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUsers([]);
      setUnreadCount(0);
      setLiveMessages({});
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users.map(Number));
    });

    // A message was delivered to us
    socket.on('receive_message', (msg) => {
      const partnerId = msg.sender_id;
      setLiveMessages(prev => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), msg],
      }));
      setUnreadCount(n => n + 1);
    });

    // Echo of our own sent message (with DB id/timestamp)
    socket.on('message_sent', (msg) => {
      const partnerId = msg.receiver_id;
      setLiveMessages(prev => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), msg],
      }));
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // In-app notification delivery
    socket.on('new_notification', (notification) => {
      setNotificationTrigger(notification);
    });

    // Fetch initial unread count from REST
    API.get('/messages/unread-count')
      .then(res => setUnreadCount(res.data.count))
      .catch(() => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // ── Public helpers ────────────────────────────────────────────────────────────
  const sendMessage = useCallback((receiverId, content) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { receiver_id: receiverId, content });
    }
  }, []);

  const markRead = useCallback((partnerId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { sender_id: partnerId });
    }
    // Clear live unread for this partner
    setLiveMessages(prev => ({ ...prev }));
    // Refresh global count from server
    API.get('/messages/unread-count')
      .then(res => setUnreadCount(res.data.count))
      .catch(() => {});
  }, []);

  const isOnline = useCallback((userId) => onlineUsers.includes(Number(userId)), [onlineUsers]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      onlineUsers,
      unreadCount,
      liveMessages,
      notificationTrigger,
      sendMessage,
      markRead,
      isOnline,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
