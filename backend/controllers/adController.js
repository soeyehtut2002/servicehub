const db = require('../config/db');

// @desc    Get current active scheduled advertisement
// @route   GET /api/ads/active
// @access  Public
exports.getActiveAd = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM advertisements
       WHERE is_active = TRUE
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ ad: null });
    }

    res.json({ ad: result.rows[0] });
  } catch (err) {
    console.error('Error fetching active ad:', err.message);
    res.status(500).json({ error: 'Failed to fetch advertisement' });
  }
};

// @desc    Get all advertisements
// @route   GET /api/ads
// @access  Private/Admin
exports.adminGetAllAds = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM advertisements ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all ads:', err.message);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
};

// @desc    Create a new advertisement
// @route   POST /api/ads
// @access  Private/Admin
exports.adminCreateAd = async (req, res) => {
  const {
    title,
    description,
    image_url,
    logo_url,
    cta_text,
    cta_url,
    is_active,
    start_date,
    end_date,
  } = req.body;

  if (!title || !image_url) {
    return res.status(400).json({ error: 'Title and Image URL are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO advertisements (
        title, description, image_url, logo_url, cta_text, cta_url, is_active, start_date, end_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title,
        description || '',
        image_url,
        logo_url || '',
        cta_text || 'Learn More',
        cta_url || '',
        is_active !== undefined ? is_active : true,
        start_date || null,
        end_date || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating ad:', err.message);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
};

// @desc    Update an advertisement
// @route   PUT /api/ads/:id
// @access  Private/Admin
exports.adminUpdateAd = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    image_url,
    logo_url,
    cta_text,
    cta_url,
    is_active,
    start_date,
    end_date,
  } = req.body;

  if (!title || !image_url) {
    return res.status(400).json({ error: 'Title and Image URL are required' });
  }

  try {
    const checkResult = await db.query(
      'SELECT id FROM advertisements WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    const result = await db.query(
      `UPDATE advertisements
       SET title = $1,
           description = $2,
           image_url = $3,
           logo_url = $4,
           cta_text = $5,
           cta_url = $6,
           is_active = $7,
           start_date = $8,
           end_date = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title,
        description || '',
        image_url,
        logo_url || '',
        cta_text || 'Learn More',
        cta_url || '',
        is_active !== undefined ? is_active : true,
        start_date || null,
        end_date || null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating ad:', err.message);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
};

// @desc    Delete an advertisement
// @route   DELETE /api/ads/:id
// @access  Private/Admin
exports.adminDeleteAd = async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await db.query(
      'SELECT id FROM advertisements WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    await db.query('DELETE FROM advertisements WHERE id = $1', [id]);
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (err) {
    console.error('Error deleting ad:', err.message);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
};

// @desc    Toggle active state of an advertisement
// @route   PATCH /api/ads/:id/toggle
// @access  Private/Admin
exports.adminToggleAd = async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await db.query(
      'SELECT id, is_active FROM advertisements WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    const newActiveState = !checkResult.rows[0].is_active;

    const result = await db.query(
      `UPDATE advertisements
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newActiveState, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling ad status:', err.message);
    res.status(500).json({ error: 'Failed to toggle advertisement status' });
  }
};
