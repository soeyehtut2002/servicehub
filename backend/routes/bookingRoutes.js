const express = require('express');
const router  = express.Router();
const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  pauseBooking,
  adminCancelBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer
router.post('/',               protect, authorize('customer'),          createBooking);
router.get('/my',              protect, authorize('customer'),          getMyBookings);
router.patch('/:id/cancel',   protect, authorize('customer'),          cancelBooking);

// Provider
router.get('/provider',        protect, authorize('provider'),          getProviderBookings);
router.patch('/:id/status',   protect, authorize('provider'),          updateBookingStatus);
router.patch('/:id/pause',    protect, authorize('provider'),          pauseBooking);

// Admin
router.patch('/:id/admin-cancel', protect, authorize('admin'),         adminCancelBooking);

module.exports = router;
