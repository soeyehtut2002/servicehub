const express = require('express');
const router = express.Router();
const {
  getActiveAd,
  adminGetAllAds,
  adminCreateAd,
  adminUpdateAd,
  adminDeleteAd,
  adminToggleAd,
} = require('../controllers/adController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route to fetch the active ad for popup display
router.get('/active', getActiveAd);

// Admin-only routes for management
router.use(protect, authorize('admin'));

// File upload for ad image and logo
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.get('/', adminGetAllAds);
router.post('/', adminCreateAd);
router.put('/:id', adminUpdateAd);
router.delete('/:id', adminDeleteAd);
router.patch('/:id/toggle', adminToggleAd);

module.exports = router;
