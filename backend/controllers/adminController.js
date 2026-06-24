const db = require('../config/db');

// ─── @route  GET /api/admin/stats ────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [users, services, bookings, reviews] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM services WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) FROM bookings'),
      db.query('SELECT COUNT(*) FROM reviews'),
    ]);

    const bookingStats = await db.query(
      `SELECT status, COUNT(*) AS count FROM bookings GROUP BY status`
    );

    const recentBookings = await db.query(
      `SELECT b.*, s.title AS service_title, u.name AS customer_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.customer_id = u.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    const categoryStats = await db.query(
      `SELECT category, COUNT(*) AS count FROM services WHERE is_active = TRUE GROUP BY category ORDER BY count DESC`
    );

    res.status(200).json({
      totals: {
        users: parseInt(users.rows[0].count),
        services: parseInt(services.rows[0].count),
        bookings: parseInt(bookings.rows[0].count),
        reviews: parseInt(reviews.rows[0].count),
      },
      bookingsByStatus: bookingStats.rows,
      recentBookings: recentBookings.rows,
      categoryStats: categoryStats.rows,
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/users ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, phone, location, avatar_url, is_verified, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/users/:id ─────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, email, role, phone, location, bio, avatar_url,
              gallery_urls, account_type, is_verified, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = result.rows[0];

    if (profile.role === 'provider') {
      const services = await db.query(
        `SELECT s.id, s.title, s.category, s.price, s.image_url,
                s.availability_status, s.location AS service_location,
                s.description, s.is_active,
                COALESCE(ROUND(AVG(r.rating),1),0) AS avg_rating,
                COUNT(DISTINCT r.id)::int AS review_count,
                COUNT(DISTINCT b.id)::int AS booking_count
         FROM services s
         LEFT JOIN reviews r ON r.service_id = s.id
         LEFT JOIN bookings b ON b.service_id = s.id
         WHERE s.provider_id = $1
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [id]
      );
      profile.services = services.rows;

      const statsRes = await db.query(
        `SELECT
           COALESCE(ROUND(AVG(r.rating),1), 0) AS overall_rating,
           COUNT(DISTINCT r.id)::int            AS total_reviews,
           COUNT(DISTINCT b.id)::int            AS total_bookings
         FROM services s
         LEFT JOIN reviews r  ON r.service_id  = s.id
         LEFT JOIN bookings b ON b.service_id  = s.id
         WHERE s.provider_id = $1`,
        [id]
      );
      profile.stats = statsRes.rows[0];
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error('getUserById error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  PATCH /api/admin/users/:id/status ───────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const newStatus = !user.rows[0].is_active;
    const result = await db.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, is_active',
      [newStatus, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('toggleUserStatus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  DELETE /api/admin/users/:id ──────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/services ──────────────────────────────────────────
const getAllServices = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.name AS provider_name,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
         COUNT(DISTINCT r.id)::int AS review_count,
         COUNT(DISTINCT b.id)::int AS booking_count
       FROM services s
       JOIN users u ON s.provider_id = u.id
       LEFT JOIN reviews r ON r.service_id = s.id
       LEFT JOIN bookings b ON b.service_id = s.id
       GROUP BY s.id, u.name
       ORDER BY s.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getAllServices error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/bookings ──────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
         s.title       AS service_title,
         s.price,
         s.provider_id,
         cu.name       AS customer_name,
         pu.name       AS provider_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cu ON b.customer_id = cu.id
       JOIN users pu ON s.provider_id = pu.id
       ORDER BY b.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getAllBookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  DELETE /api/admin/services/:id ──────────────────────────────────
const adminDeleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT id FROM services WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    await db.query('DELETE FROM services WHERE id = $1', [id]);
    res.status(200).json({ message: 'Service deleted by admin' });
  } catch (error) {
    console.error('adminDeleteService error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


// ─── @route  GET /api/admin/reviews ──────────────────────────────────────────
const getAllReviews = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         r.*,
         u.name  AS customer_name,
         u.email AS customer_email,
         s.title AS service_title,
         s.id    AS service_id
       FROM reviews r
       JOIN users    u ON r.customer_id = u.id
       JOIN services s ON r.service_id  = s.id
       ORDER BY r.is_flagged DESC, r.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getAllReviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  PATCH /api/admin/reviews/:id/flag ────────────────────────────────
const flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag_reason } = req.body;
    const check = await db.query('SELECT id, is_flagged FROM reviews WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    const newFlagged = !check.rows[0].is_flagged;
    const result = await db.query(
      `UPDATE reviews SET is_flagged = $1, flag_reason = $2 WHERE id = $3
       RETURNING id, is_flagged, flag_reason`,
      [newFlagged, flag_reason || null, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('flagReview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  DELETE /api/admin/reviews/:id ───────────────────────────────────

const adminDeleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.status(200).json({ message: 'Review deleted by admin' });
  } catch (error) {
    console.error('adminDeleteReview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/cancellations ───────────────────────────────────────────
const getCancellations = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         b.id,
         b.cancelled_by,
         b.cancellation_reason,
         b.cancelled_at,
         b.booking_date,
         b.notes,
         b.location,
         s.title AS service_title,
         s.price,
         cu.name  AS customer_name,
         cu.email AS customer_email,
         pu.name  AS provider_name,
         pu.email AS provider_email
       FROM bookings b
       JOIN services s  ON b.service_id  = s.id
       JOIN users    cu ON b.customer_id = cu.id
       JOIN users    pu ON s.provider_id = pu.id
       WHERE b.status = 'cancelled'
       ORDER BY COALESCE(b.cancelled_at, b.updated_at) DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getCancellations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/chats ────────────────────────────────────────────
// Lists all unique user-to-user conversations on the platform
const getAdminConversations = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         LEAST(m.sender_id, m.receiver_id)    AS user_a_id,
         GREATEST(m.sender_id, m.receiver_id) AS user_b_id,
         ua.name       AS user_a_name,
         ua.role       AS user_a_role,
         ua.avatar_url AS user_a_avatar,
         ub.name       AS user_b_name,
         ub.role       AS user_b_role,
         ub.avatar_url AS user_b_avatar,
         COUNT(m.id)::int  AS message_count,
         MAX(m.created_at) AS last_message_at,
         (SELECT m2.content FROM messages m2
          WHERE (m2.sender_id   = LEAST(m.sender_id, m.receiver_id)
             AND m2.receiver_id = GREATEST(m.sender_id, m.receiver_id))
             OR (m2.sender_id   = GREATEST(m.sender_id, m.receiver_id)
             AND m2.receiver_id = LEAST(m.sender_id, m.receiver_id))
          ORDER BY m2.created_at DESC LIMIT 1
         ) AS last_message
       FROM messages m
       JOIN users ua ON ua.id = LEAST(m.sender_id, m.receiver_id)
       JOIN users ub ON ub.id = GREATEST(m.sender_id, m.receiver_id)
       GROUP BY
         LEAST(m.sender_id, m.receiver_id),
         GREATEST(m.sender_id, m.receiver_id),
         ua.name, ua.role, ua.avatar_url,
         ub.name, ub.role, ub.avatar_url
       ORDER BY last_message_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getAdminConversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── @route  GET /api/admin/chats/:userAId/:userBId ──────────────────────────
// Full message thread between two specific users (admin read-only)
const getAdminConversationThread = async (req, res) => {
  try {
    const { userAId, userBId } = req.params;
    const result = await db.query(
      `SELECT
         m.*,
         u.name       AS sender_name,
         u.role       AS sender_role,
         u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [parseInt(userAId), parseInt(userBId)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getAdminConversationThread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  getAllServices,
  getAllBookings,
  adminDeleteService,
  getAllReviews,
  flagReview,
  adminDeleteReview,
  getCancellations,
  getAdminConversations,
  getAdminConversationThread,
};

