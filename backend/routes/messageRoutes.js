const express = require('express');
const router  = express.Router();
const { getUnreadCount, getMyConversations, getConversation, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/unread-count',     getUnreadCount);
router.get('/conversations',    getMyConversations);
router.get('/:userId',          getConversation);
router.patch('/:userId/read',   markAsRead);

module.exports = router;
