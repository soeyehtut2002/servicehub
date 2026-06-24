require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const path       = require('path');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const authRoutes         = require('./routes/authRoutes');
const serviceRoutes      = require('./routes/serviceRoutes');
const bookingRoutes      = require('./routes/bookingRoutes');
const reviewRoutes       = require('./routes/reviewRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const providerRoutes     = require('./routes/providerRoutes');
const profileRoutes      = require('./routes/profileRoutes');
const timeSlotRoutes     = require('./routes/timeSlotRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const scheduleRoutes     = require('./routes/scheduleRoutes');
const currencyRoutes     = require('./routes/currencyRoutes');
const adRoutes           = require('./routes/adRoutes');
const socketState        = require('./services/socketState');

const app        = express();
const httpServer = http.createServer(app);

const rawClientUrl = process.env.CLIENT_URL;
const cleanedClientUrl = rawClientUrl ? rawClientUrl.replace(/\/$/, '') : null;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://servicehub0-2-frontend.onrender.com',
];

if (cleanedClientUrl) {
  ALLOWED_ORIGINS.push(cleanedClientUrl);
  ALLOWED_ORIGINS.push(cleanedClientUrl + '/');
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

// Authenticate socket connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;   // { id, role }
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Track online users: userId (Number) -> Set of socket.id (Strings)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = parseInt(socket.user?.id);
  if (isNaN(userId)) {
    console.error(`❌ Connection rejected: user ID is invalid/NaN`);
    return socket.disconnect();
  }

  // Join user-specific room for broadcasting to all of this user's tabs/connections
  socket.join(`user_${userId}`);

  // Track socket ID under the user's online sockets Set
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  console.log(`🟢 User ${userId} connected (socket: ${socket.id}). Active sockets: ${onlineUsers.get(userId).size}`);

  // Broadcast updated online list
  io.emit('online_users', Array.from(onlineUsers.keys()));

  // Send a private message
  socket.on('send_message', async ({ receiver_id, content }) => {
    const targetReceiverId = parseInt(receiver_id);
    if (isNaN(targetReceiverId) || !content?.trim()) return;
    try {
      const db = require('./config/db');
      const result = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, targetReceiverId, content.trim()]
      );
      const msg = result.rows[0];

      // Send to receiver's room (delivers to all of their active connections/tabs)
      io.to(`user_${targetReceiverId}`).emit('receive_message', msg);
      
      // Echo back to all of sender's active connections/tabs (sync across tabs)
      io.to(`user_${userId}`).emit('message_sent', msg);
    } catch (err) {
      console.error('Socket send_message error:', err.message);
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ sender_id }) => {
    const targetSenderId = parseInt(sender_id);
    if (isNaN(targetSenderId)) return;
    try {
      const db = require('./config/db');
      await db.query(
        `UPDATE messages SET is_read = TRUE
         WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
        [targetSenderId, userId]
      );
      // Notify all of this user's connections that messages from targetSenderId are read
      io.to(`user_${userId}`).emit('messages_marked_read', { sender_id: targetSenderId });
    } catch (err) {
      console.error('Socket mark_read error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
      }
      console.log(`🔴 User ${userId} disconnected (socket: ${socket.id}). Remaining sockets: ${userSockets.size}`);
    } else {
      console.log(`🔴 User ${userId} disconnected (socket: ${socket.id}). No socket set found.`);
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// Initialise shared socket state so notificationService can emit without circular imports
socketState.init(io, onlineUsers);
module.exports.io = io;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads folder ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/services',  serviceRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/messages',  messageRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/slots',         timeSlotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedule',      scheduleRoutes);
app.use('/api/currency',      currencyRoutes);
app.use('/api/ads',           adRoutes);


// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🚀 ServiceHub API is running', version: '1.1.0' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { initDb } = require('./db-init');

initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 ServiceHub API running on http://localhost:${PORT}`);
      console.log(`⚡ Socket.io enabled for real-time chat`);
      console.log(`📁 Uploads served from /uploads`);
      console.log(`🗄️  Database: ${process.env.DATABASE_URL?.replace(/:.*@/, ':****@')}\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Database initialization failed. Server NOT started:', err.message);
    process.exit(1);
  });

// Reload triggered by file edit
