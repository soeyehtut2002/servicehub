const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSchedule, saveSchedule,
  getBlockedDates, addBlockedDate, removeBlockedDate,
  generateSlots, getPublicSchedule,
} = require('../controllers/scheduleController');

// Public
router.get('/:serviceId/public', getPublicSchedule);

// Provider only
router.get('/:serviceId',                protect, authorize('provider'), getSchedule);
router.put('/:serviceId',                protect, authorize('provider'), saveSchedule);
router.get('/:serviceId/blocked',        protect, authorize('provider'), getBlockedDates);
router.post('/:serviceId/blocked',       protect, authorize('provider'), addBlockedDate);
router.delete('/:serviceId/blocked/:id', protect, authorize('provider'), removeBlockedDate);
router.post('/:serviceId/generate-slots',protect, authorize('provider'), generateSlots);

module.exports = router;
