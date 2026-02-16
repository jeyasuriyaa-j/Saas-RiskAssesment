import { query } from '../database/connection';
import { logger } from '../utils/logger';

export interface UserContext {
    userId: string;
    tenantId: string;
    role: string;
}

/**
 * Permission Service
 * Filters database entities based on user role and tenant.
 */
export const permissionService = {
    /**
     * Fetch and filter risks the user is allowed to see.
     */
    getFilteredRisks: async (user: UserContext) => {
        logger.info(`Fetching filtered risks for user ${user.userId} (Role: ${user.role})`);

        // Admins and Risk Managers see all risks in the tenant
        if (['admin', 'risk_manager'].includes(user.role)) {
            const result = await query(
                'SELECT risk_id, statement, status, category, likelihood_score, impact_score FROM risks WHERE tenant_id = $1 AND status != $2',
                [user.tenantId, 'DELETED']
            );
            return result.rows;
        }

        // Viewer, User, Auditor only see ACTIVE risks, or risks they own
        const result = await query(
            'SELECT risk_id, statement, status, category, likelihood_score, impact_score FROM risks WHERE tenant_id = $1 AND status = $2 OR owner_user_id = $3',
            [user.tenantId, 'ACTIVE', user.userId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter controls.
     */
    getFilteredControls: async (user: UserContext) => {
        // Simple tenant isolation for controls
        const result = await query(
            'SELECT control_id, control_name, description, implementation_status FROM controls WHERE tenant_id = $1',
            [user.tenantId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter events (incidents).
     */
    getFilteredEvents: async (user: UserContext) => {
        const result = await query(
            'SELECT event_id, event_name, event_type, severity, description FROM events WHERE tenant_id = $1',
            [user.tenantId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter users based on role.
     * Admins and Risk Managers can see all users in the tenant.
     */
    getFilteredUsers: async (user: UserContext) => {
        // Only admins and risk managers can see user list
        if (['admin', 'risk_manager'].includes(user.role)) {
            const result = await query(
                'SELECT user_id, full_name, email, role, department, is_active, created_at FROM users WHERE tenant_id = $1',
                [user.tenantId]
            );
            return result.rows;
        }
        
        // Regular users can only see their own info
        const result = await query(
            'SELECT user_id, full_name, email, role, department, is_active, created_at FROM users WHERE user_id = $1',
            [user.userId]
        );
        return result.rows;
    }
};
