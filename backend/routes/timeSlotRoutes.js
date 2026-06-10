const express = require('express');
const router  = express.Router();
const { createSlots, bulkGenerateSlots, getServiceSlots, deleteSlot } = require('../controllers/timeSlotController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public: get all slots for a service (with optional ?from=&to= date filter)
router.get('/service/:id', getServiceSlots);

// Provider: create individual slots
router.post('/', protect, authorize('provider'), createSlots);

// Provider: bulk-generate slots from a start time across multiple dates
router.post('/bulk-generate', protect, authorize('provider'), bulkGenerateSlots);

// Provider: delete a slot (only if no active bookings)
router.delete('/:id', protect, authorize('provider'), deleteSlot);

module.exports = router;
