const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notificationController');

router.get('/',              protect, getNotifications);
router.get('/unread-count',  protect, getUnreadCount);
router.patch('/read-all',    protect, markAllRead);
router.patch('/:id/read',    protect, markRead);
router.delete('/:id',        protect, deleteNotification);

module.exports = router;
