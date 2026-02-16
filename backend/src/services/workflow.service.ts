
import { Pool } from 'pg';
import { RiskComment } from '../models/enterprise.model';
import { NotificationService } from './notification.service';

export class WorkflowService {
    private pool: Pool;
    private notificationService: NotificationService;

    constructor(pool: Pool, notificationService: NotificationService) {
        this.pool = pool;
        this.notificationService = notificationService;
    }

    async assignRisk(riskId: string, assigneeUserId: string, _assignerId: string, dueDate?: Date) {
        // 1. Create Assignment
        const result = await this.pool.query(
            `INSERT INTO risk_assignments (risk_id, user_id, status, due_date)
             VALUES ($1, $2, 'PENDING', $3)
             RETURNING *`,
            [riskId, assigneeUserId, dueDate]
        );

        // 2. Update Risk Cache
        await this.pool.query(
            `UPDATE risks 
             SET current_assignee_ids = array_append(current_assignee_ids, $2) 
             WHERE risk_id = $1`,
            [riskId, assigneeUserId]
        );

        // 3. Notify User
        await this.notificationService.createNotification(
            assigneeUserId,
            'ASSIGNMENT',
            'You have been assigned a new risk.',
            `/risks/${riskId}`
        );

        return result.rows[0];
    }

    async updateRiskStatus(riskId: string, status: string, userId: string, comment?: string) {
        // 1. Update Risk Status
        const result = await this.pool.query(
            `UPDATE risks 
             SET status = $2, updated_at = NOW() 
             WHERE risk_id = $1 
             RETURNING *`,
            [riskId, status]
        );

        // 2. Add Comment if provided
        if (comment) {
            await this.addComment(riskId, userId, comment);
        }

        // 3. Notify Risk Owner (Manager)
        const risk = result.rows[0];
        if (risk.owner_user_id && risk.owner_user_id !== userId) {
            await this.notificationService.createNotification(
                risk.owner_user_id,
                'STATUS_CHANGE',
                `Risk status updated to ${status}.`,
                `/risks/${riskId}`
            );
        }

        return risk;
    }

    async addComment(riskId: string, userId: string, text: string) {
        const result = await this.pool.query(
            `INSERT INTO risk_comments (risk_id, user_id, text) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [riskId, userId, text]
        );

        // Notify relevant parties (Owner or Assignees) - simplified for now
        // Ideally fetch all assignees -> notify them except the commenter

        return result.rows[0];
    }

    async getRiskComments(riskId: string) {
        const result = await this.pool.query(
            `SELECT c.*, u.full_name as user_name, u.role as user_role 
             FROM risk_comments c 
             JOIN users u ON c.user_id = u.user_id 
             WHERE c.risk_id = $1 
             ORDER BY c.created_at ASC`,
            [riskId]
        );
        return result.rows as RiskComment[];
    }

    async getMyAssignments(userId: string) {
        const result = await this.pool.query(
            `SELECT ra.*, r.statement as risk_title, r.status as risk_status, r.priority as risk_priority
             FROM risk_assignments ra
             JOIN risks r ON ra.risk_id = r.risk_id
             WHERE ra.user_id = $1
             ORDER BY ra.due_date ASC`,
            [userId]
        );
        return result.rows;
    }
}
