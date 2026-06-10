const db = require('../config/db');

// ── @route  GET /api/profile/:id  (public) ───────────────────────────────────
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, role, account_type, location, avatar_url, bio,
              gallery_urls, is_verified, created_at
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = result.rows[0];

    // If provider, include their services + aggregate review stats
    if (profile.role === 'provider') {
      const services = await db.query(
        `SELECT s.id, s.title, s.category, s.price, s.currency, s.image_url,
                s.availability_status, s.location AS service_location,
                s.description,
                COALESCE(ROUND(AVG(r.rating),1),0) AS avg_rating,
                COUNT(DISTINCT r.id)::int AS review_count,
                COUNT(DISTINCT b.id)::int AS booking_count
         FROM services s
         LEFT JOIN reviews r ON r.service_id = s.id
         LEFT JOIN bookings b ON b.service_id = s.id
         WHERE s.provider_id = $1 AND s.is_active = TRUE
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [id]
      );
      profile.services = services.rows;

      // Overall provider stats
      const statsRes = await db.query(
        `SELECT
           COALESCE(ROUND(AVG(r.rating),1), 0) AS overall_rating,
           COUNT(DISTINCT r.id)::int            AS total_reviews,
           COUNT(DISTINCT b.id)::int            AS total_bookings
         FROM services s
         LEFT JOIN reviews r  ON r.service_id  = s.id
         LEFT JOIN bookings b ON b.service_id  = s.id
         WHERE s.provider_id = $1 AND s.is_active = TRUE`,
        [id]
      );
      profile.stats = statsRes.rows[0];
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error('getPublicProfile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/profile/avatar ─────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const avatar_url = `/uploads/${req.file.filename}`;

    const result = await db.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role, account_type, avatar_url, gallery_urls, bio`,
      [avatar_url, req.user.id]
    );

    res.status(200).json({ message: 'Avatar updated', user: result.rows[0] });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/profile/gallery ────────────────────────────────────────
// Accepts up to 10 images; appends to existing gallery (max 10 total)
const uploadGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    // Get current gallery
    const current = await db.query(
      'SELECT gallery_urls FROM users WHERE id = $1',
      [req.user.id]
    );
    const existing = current.rows[0]?.gallery_urls || [];

    if (existing.length >= 10) {
      return res.status(400).json({ error: 'Gallery is full (max 10 images). Delete some first.' });
    }

    const newUrls  = req.files.map(f => `/uploads/${f.filename}`);
    const combined = [...existing, ...newUrls].slice(0, 10); // enforce max 10

    const result = await db.query(
      `UPDATE users SET gallery_urls = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, gallery_urls`,
      [combined, req.user.id]
    );

    res.status(200).json({
      message: `${newUrls.length} image(s) added to gallery`,
      gallery_urls: result.rows[0].gallery_urls,
    });
  } catch (error) {
    console.error('uploadGalleryImages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  DELETE /api/profile/gallery/:index ───────────────────────────────
const deleteGalleryImage = async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);

    const current = await db.query(
      'SELECT gallery_urls FROM users WHERE id = $1',
      [req.user.id]
    );
    const gallery = current.rows[0]?.gallery_urls || [];

    if (index < 0 || index >= gallery.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    gallery.splice(index, 1);

    const result = await db.query(
      `UPDATE users SET gallery_urls = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING gallery_urls`,
      [gallery, req.user.id]
    );

    res.status(200).json({
      message: 'Image removed from gallery',
      gallery_urls: result.rows[0].gallery_urls,
    });
  } catch (error) {
    console.error('deleteGalleryImage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getPublicProfile,
  uploadAvatar,
  uploadGalleryImages,
  deleteGalleryImage,
};
