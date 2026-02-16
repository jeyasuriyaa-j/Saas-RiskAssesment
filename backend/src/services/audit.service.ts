import { query } from '../database/connection';
import { logger } from '../utils/logger';

export type ChangeType = 'created' | 'updated' | 'status_changed' | 'score_changed' | 'deleted' | 'task_assigned' | 'task_updated' | 'task_created';

export interface AuditLogEntry {
    risk_id: string;
    changed_by: string;
    change_type: ChangeType;
    field_name?: string;
    old_value?: any;
    new_value?: any;
    change_reason?: string;
}

/**
 * Audit Service for tracking all changes to risks
 */
export const auditService = {
    /**
     * Log a change to the risk_history table
     */
    async logChange(entry: AuditLogEntry) {
        try {
            const {
                risk_id,
                changed_by,
                change_type,
                field_name,
                old_value,
                new_value,
                change_reason
            } = entry;

            const result = await query(
                `INSERT INTO risk_history (
                    risk_id, changed_by, change_type, field_name, 
                    old_value, new_value, change_reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING history_id`,
                [
                    risk_id,
                    changed_by,
                    change_type,
                    field_name,
                    old_value !== undefined ? String(old_value) : null,
                    new_value !== undefined ? String(new_value) : null,
                    change_reason || null
                ]
            );

            const history_id = result.rows[0].history_id;
            logger.info(`Audit log created: ${change_type} on risk ${risk_id} (ID: ${history_id})`);
            return history_id;
        } catch (error) {
            logger.error('Failed to create audit log:', error);
            // We don't throw here to avoid failing the main operation
            // but in a production system we might want more robust handling
        }
    },

    /**
     * Get history for a specific risk
     */
    async getHistory(risk_id: string, tenant_id: string) {
        const result = await query(
            `    SELECT rh.*, u.full_name as changed_by_name
            FROM risk_history rh
            LEFT JOIN users u ON rh.changed_by = u.user_id
            JOIN risks r ON rh.risk_id = r.risk_id
            WHERE rh.risk_id = $1 AND r.tenant_id = $2
            ORDER BY rh.changed_at DESC`,
            [risk_id, tenant_id]
        );
        return result.rows;
    },

    /**
     * Log a global action to the audit_log table (for Admin Audit History)
     */
    async logAction(params: {
        tenant_id: string;
        entity_type: string;
        entity_id: string;
        action: string;
        actor_user_id: string;
        actor_name?: string;
        changes: any;
    }) {
        try {
            const { tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes } = params;

            // If actor_name is not provided, try to fetch it
            let finalActorName = actor_name;
            if (!finalActorName) {
                const userResult = await query('SELECT full_name FROM users WHERE user_id = $1', [actor_user_id]);
                if (userResult.rows.length > 0) {
                    finalActorName = userResult.rows[0].full_name;
                }
            }

            await query(
                `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [tenant_id, entity_type, entity_id, action, actor_user_id, finalActorName || 'Unknown User', JSON.stringify(changes)]
            );
        } catch (error) {
            logger.error('Failed to log global audit action:', error);
        }
    }
};
