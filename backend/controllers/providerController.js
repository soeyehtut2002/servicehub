const db = require('../config/db');

// ─── GET /api/providers/:id ───────────────────────────────────────────────────
const getProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Provider user info
    const userResult = await db.query(
      `SELECT id, name, role, bio, location, avatar_url, created_at
       FROM users WHERE id = $1 AND role = 'provider'`,
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const provider = userResult.rows[0];

    // Services offered by this provider
    const servicesResult = await db.query(
      `SELECT
         s.id, s.title, s.description, s.category, s.price, s.location,
         s.image_url, s.is_active,
         COALESCE(AVG(r.rating), 0)  AS avg_rating,
         COUNT(DISTINCT r.id)         AS review_count,
         COUNT(DISTINCT b.id)         AS booking_count
       FROM services s
       LEFT JOIN reviews  r ON r.service_id = s.id
       LEFT JOIN bookings b ON b.service_id = s.id
       WHERE s.provider_id = $1 AND s.is_active = TRUE
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [id]
    );

    // Recent reviews across all services
    const reviewsResult = await db.query(
      `SELECT
         r.id, r.rating, r.comment, r.created_at,
         u.name AS customer_name,
         s.title AS service_title
       FROM reviews r
       JOIN users    u ON r.customer_id = u.id
       JOIN services s ON r.service_id  = s.id
       WHERE s.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    // Overall stats
    const statsResult = await db.query(
      `SELECT
         COALESCE(AVG(r.rating), 0) AS avg_rating,
         COUNT(DISTINCT r.id)        AS total_reviews,
         COUNT(DISTINCT b.id)        AS total_bookings
       FROM services s
       LEFT JOIN reviews  r ON r.service_id = s.id
       LEFT JOIN bookings b ON b.service_id = s.id AND b.status = 'completed'
       WHERE s.provider_id = $1`,
      [id]
    );

    res.json({
      ...provider,
      stats: statsResult.rows[0],
      services: servicesResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (err) {
    console.error('getProviderProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getProviderProfile };
