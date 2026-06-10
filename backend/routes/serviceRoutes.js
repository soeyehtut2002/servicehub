const express = require('express');
const router = express.Router();
const {
  getServices,
  getFeaturedServices,
  getServiceById,
  getProviderServices,
  createService,
  updateService,
  deleteService,
  setAvailability,
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadServiceImages } = require('../middleware/uploadMiddleware');

router.get('/', getServices);
router.get('/featured', getFeaturedServices);
router.get('/provider/mine', protect, authorize('provider'), getProviderServices);
router.get('/:id', getServiceById);

router.post('/', protect, authorize('provider'), uploadServiceImages.array('images', 7), createService);
router.put('/:id', protect, authorize('provider', 'admin'), uploadServiceImages.array('images', 7), updateService);
router.patch('/:id/availability', protect, authorize('provider', 'admin'), setAvailability);
router.delete('/:id', protect, authorize('provider', 'admin'), deleteService);

module.exports = router;
