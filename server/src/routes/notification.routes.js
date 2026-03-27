import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.patch('/:id/read', validateUUID('id'), requireAuth, markAsRead);
router.patch('/read-all', requireAuth, markAllAsRead);
router.delete('/:id', validateUUID('id'), requireAuth, deleteNotification);
router.delete('/', requireAuth, deleteAllNotifications);

export default router;
