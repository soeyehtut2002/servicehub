const express = require('express');
const router = express.Router();
const {
  getStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  getAllServices,
  getAllBookings,
  adminDeleteService,
  getAllReviews,
  flagReview,
  adminDeleteReview,
  getCancellations,
  getAdminConversations,
  getAdminConversationThread,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/stats',                        getStats);
router.get('/users',                         getAllUsers);
router.get('/users/:id',                     getUserById);
router.patch('/users/:id/status',            toggleUserStatus);
router.delete('/users/:id',                  deleteUser);
router.get('/services',                      getAllServices);
router.delete('/services/:id',               adminDeleteService);
router.get('/bookings',                      getAllBookings);
router.get('/cancellations',                 getCancellations);
router.get('/reviews',                       getAllReviews);
router.patch('/reviews/:id/flag',            flagReview);
router.delete('/reviews/:id',                adminDeleteReview);
router.get('/chats',                         getAdminConversations);
router.get('/chats/:userAId/:userBId',       getAdminConversationThread);

module.exports = router;


