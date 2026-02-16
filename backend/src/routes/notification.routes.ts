import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getUserNotifications, markNotificationAsRead, getUnreadCount } from '../services/notification.service';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../database/connection';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);
// Note: No additional authorization needed - all authenticated users can access their notifications

// GET /api/v1/notifications - Get user's notifications
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;

    const notifications = await getUserNotifications(userId, tenantId);

    return res.json({ notifications });
}));

// PATCH /api/v1/notifications/:id/read - Mark notification as read
router.patch('/:id/read', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { id } = req.params;

    await markNotificationAsRead(id, userId);

    return res.json({ success: true, message: 'Notification marked as read' });
}));

// GET /api/v1/notifications/unread-count - Get unread count
router.get('/unread-count', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;

    const count = await getUnreadCount(userId, tenantId);

    return res.json({ count });
}));

// POST /api/v1/notifications/subscribe - Save push subscription
router.post('/subscribe', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;
    const { subscription } = req.body;

    if (!subscription) {
        return res.status(400).json({ error: 'Subscription is required' });
    }

    await query(
        `INSERT INTO push_subscriptions (user_id, tenant_id, subscription_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, subscription_data) DO UPDATE SET updated_at = NOW()`,
        [userId, tenantId, JSON.stringify(subscription)]
    );

    return res.status(201).json({ message: 'Push subscription saved' });
}));

export default router;
