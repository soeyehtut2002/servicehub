const db = require('../config/db');

// ─── GET /api/messages/unread-count ──────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /api/messages/conversations ─────────────────────────────────────────
// Returns list of unique chat partners with last message + unread count
const getMyConversations = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (partner_id)
         partner_id,
         partner_name,
         partner_role,
         partner_avatar,
         last_message,
         last_time,
         unread
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
           u.name  AS partner_name,
           u.role  AS partner_role,
           u.avatar_url AS partner_avatar,
           m.content AS last_message,
           m.created_at AS last_time,
           COUNT(*) FILTER (WHERE m.receiver_id = $1 AND m.is_read = FALSE) AS unread
         FROM messages m
         JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         GROUP BY partner_id, u.name, u.role, u.avatar_url, m.content, m.created_at
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY partner_id, last_time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getMyConversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /api/messages/:userId ────────────────────────────────────────────────
const getConversation = async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId);
    const myId    = req.user.id;

    const result = await db.query(
      `SELECT m.*, u.name AS sender_name, u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [myId, otherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getConversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── PATCH /api/messages/:userId/read ────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [parseInt(req.params.userId), req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getUnreadCount, getMyConversations, getConversation, markAsRead };
