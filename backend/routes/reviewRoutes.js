const express = require('express');
const router  = express.Router();
const { createReview, updateReview, getServiceReviews, deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadReview } = require('../middleware/uploadMiddleware');

// Public: get reviews for a service
router.get('/service/:id', getServiceReviews);

// Customer: create review with optional image uploads (up to 4)
router.post('/',    protect, authorize('customer'), uploadReview.array('images', 4), createReview);

// Customer: edit own review (can replace images)
router.put('/:id',  protect, authorize('customer'), uploadReview.array('images', 4), updateReview);

// Customer or Admin: delete review
router.delete('/:id', protect, deleteReview);

module.exports = router;
