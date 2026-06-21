/**
 * notificationService.js
 * Creates a DB notification and emits a real-time socket event to the target user.
 * Import and call notify() from any controller.
 */

const db          = require('../config/db');
const socketState = require('./socketState');

/**
 * notify({ userId, type, title, message, data, email? })
 *
 * type examples:
 *   'booking_new'        — sent to provider on new booking
 *   'booking_confirmed'  — sent to customer when provider confirms
 *   'booking_cancelled'  — sent to either party on cancellation
 *   'booking_completed'  — sent to customer on completion
 *   'booking_status'     — generic status change
 */
async function notify({ userId, type, title, message, data = null, emailFn = null }) {
  try {
    // 1. Persist to DB
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );
    const notification = result.rows[0];

    // 2. Emit via Socket.io if user is online
    const io          = socketState.getIo();
    const onlineUsers = socketState.getOnlineUsers();
    if (io && onlineUsers) {
      const targetUserId = parseInt(userId);
      if (!isNaN(targetUserId) && onlineUsers.has(targetUserId)) {
        io.to(`user_${targetUserId}`).emit('new_notification', notification);
      }
    }

    // 3. Send email if a template function was provided
    if (emailFn) {
      emailFn().catch((e) => console.error('Email error:', e.message));
    }

    return notification;
  } catch (err) {
    // Never crash a booking flow due to notification failure
    console.error('notificationService error:', err.message);
    return null;
  }
}

module.exports = { notify };
