const express = require('express');
const router  = express.Router();
const {
  getPublicProfile,
  uploadAvatar,
  uploadGalleryImages,
  deleteGalleryImage,
} = require('../controllers/profileController');
const { protect }    = require('../middleware/authMiddleware');
const { uploadAvatar: avatarUpload, uploadGallery } = require('../middleware/uploadMiddleware');

// Public profile view (by user ID)
router.get('/:id', getPublicProfile);

// Upload avatar (single image)
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

// Upload gallery images (up to 10)
router.post('/gallery', protect, uploadGallery.array('images', 10), uploadGalleryImages);

// Delete one gallery image by index
router.delete('/gallery/:index', protect, deleteGalleryImage);

module.exports = router;
