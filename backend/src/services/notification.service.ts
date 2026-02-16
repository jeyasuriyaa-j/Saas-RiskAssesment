import { Pool } from 'pg';
import { Notification } from '../models/enterprise.model';
import { query } from '../database/connection';
import logger from '../utils/logger';
import webpush from 'web-push';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@riskassessment.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    logger.info('Web Push VAPID details configured');
} else {
    logger.warn('Web Push VAPID keys missing. Push notifications will not be sent.');
}

export class NotificationService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async createNotification(userId: string, type: 'ASSIGNMENT' | 'COMMENT' | 'STATUS_CHANGE' | 'OVERDUE', message: string, link?: string) {
        const result = await this.pool.query(
            `INSERT INTO notifications (user_id, type, message, link, read) 
             VALUES ($1, $2, $3, $4, false) 
             RETURNING *`,
            [userId, type, message, link]
        );
        return result.rows[0];
    }

    async getUserNotifications(userId: string) {
        const result = await this.pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );
        return result.rows as Notification[];
    }

    async markAsRead(notificationId: string) {
        await this.pool.query(
            'UPDATE notifications SET read = true WHERE notification_id = $1',
            [notificationId]
        );
    }

    async getUnreadCount(userId: string) {
        const result = await this.pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
            [userId]
        );
        return parseInt(result.rows[0].count);
    }

    async saveSubscription(userId: string, tenantId: string, subscription: any) {
        await this.pool.query(
            `INSERT INTO push_subscriptions (user_id, tenant_id, subscription_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, subscription_data) DO UPDATE SET updated_at = NOW()`,
            [userId, tenantId, JSON.stringify(subscription)]
        );
    }

    async sendPushToUser(userId: string, tenantId: string, payload: any) {
        try {
            const subscriptions = await this.pool.query(
                'SELECT subscription_data FROM push_subscriptions WHERE user_id = $1 AND tenant_id = $2',
                [userId, tenantId]
            );

            const promises = subscriptions.rows.map((sub: any) =>
                webpush.sendNotification(JSON.parse(sub.subscription_data), JSON.stringify(payload))
                    .catch(async (err) => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            // Subscription expired or no longer valid
                            logger.info(`Push subscription expired for user ${userId}, removing...`);
                            await this.pool.query(
                                'DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription_data = $2',
                                [userId, sub.subscription_data]
                            );
                        } else {
                            logger.error(`Error sending push to user ${userId}:`, err);
                        }
                    })
            );

            await Promise.all(promises);
        } catch (error) {
            logger.error(`Failed to send push to user ${userId}:`, error);
        }
    }
}

// Standalone functions for use outside of class context
export async function createRiskAssignmentNotification(
    tenantId: string,
    userId: string,
    riskId: string,
    riskTitle: string
): Promise<void> {
    try {
        await query(
            `INSERT INTO notifications (tenant_id, user_id, risk_id, message, read, type)
             VALUES ($1, $2, $3, $4, false, 'ASSIGNMENT')`,
            [tenantId, userId, riskId, `You have been assigned to risk: ${riskTitle}`]
        );
        logger.info(`Created assignment notification for user ${userId} on risk ${riskId}`);
    } catch (error) {
        logger.error('Failed to create assignment notification:', error);
        throw error;
    }
}

export async function getUserNotifications(userId: string, tenantId: string): Promise<any[]> {
    const result = await query(
        `SELECT n.*, r.statement as risk_statement, r.risk_code
         FROM notifications n
         LEFT JOIN risks r ON n.risk_id = r.risk_id
         WHERE n.user_id = $1 AND n.tenant_id = $2
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [userId, tenantId]
    );
    return result.rows;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await query(
        'UPDATE notifications SET read = true WHERE notification_id = $1 AND user_id = $2',
        [notificationId, userId]
    );
}

export async function getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const result = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND tenant_id = $2 AND read = false',
        [userId, tenantId]
    );
    return parseInt(result.rows[0].count, 10);
}

export async function createTaskAssignmentNotification(
    tenantId: string,
    userId: string,
    taskId: string,
    taskTitle: string,
    riskStatement: string,
    riskId: string,
    riskCode?: string
): Promise<void> {
    try {
        await query(
            `INSERT INTO notifications (tenant_id, user_id, message, read, type, risk_id, created_at)
             VALUES ($1, $2, $3, false, 'ASSIGNMENT', $4, CURRENT_TIMESTAMP)`,
            [tenantId, userId, `You have been assigned a task: "${taskTitle}" for risk "${riskStatement}"${riskCode ? ` (${riskCode})` : ''}`, riskId]
        );
        logger.info(`Created task assignment notification for user ${userId} on task ${taskId}, risk ${riskId}`);
    } catch (error) {
        logger.error('Failed to create task assignment notification:', error);
        // Don't throw - notification failure shouldn't block task assignment
    }
}

export async function createTaskCompletionNotification(
    tenantId: string,
    managerId: string,
    taskId: string,
    taskTitle: string,
    riskStatement: string,
    riskId: string,
    riskCode: string | undefined,
    completedByUserId: string
): Promise<void> {
    try {
        // Get user name
        const userResult = await query('SELECT full_name FROM users WHERE user_id = $1', [completedByUserId]);
        const userName = userResult.rows[0]?.full_name || 'User';

        await query(
            `INSERT INTO notifications (tenant_id, user_id, message, read, type, risk_id, created_at)
             VALUES ($1, $2, $3, false, 'STATUS_CHANGE', $4, CURRENT_TIMESTAMP)`,
            [tenantId, managerId, `${userName} completed task "${taskTitle}" for risk "${riskStatement}"${riskCode ? ` (${riskCode})` : ''}`, riskId]
        );
        logger.info(`Created task completion notification for manager ${managerId} on task ${taskId}`);
    } catch (error) {
        logger.error('Failed to create task completion notification:', error);
        // Don't throw - notification failure shouldn't block task update
    }
}

// Utility to send push via standalone function
export async function sendPushNotification(userId: string, tenantId: string, title: string, body: string, data?: any) {
    const subscriptions = await query(
        'SELECT subscription_data FROM push_subscriptions WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );

    const payload = JSON.stringify({
        notification: {
            title,
            body,
            icon: '/logo192.png',
            badge: '/logo192.png',
            data: data || {}
        }
    });

    const promises = subscriptions.rows.map((sub: any) =>
        webpush.sendNotification(JSON.parse(sub.subscription_data), payload)
            .catch(async (err) => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await query(
                        'DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription_data = $2',
                        [userId, sub.subscription_data]
                    );
                }
            })
    );

    await Promise.all(promises);
}
