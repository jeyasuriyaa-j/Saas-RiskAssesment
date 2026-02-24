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
        if (['admin', 'risk_manager'].includes(user.role?.toLowerCase())) {
            const result = await query(
                `SELECT risk_id, risk_code, statement, status, category, 
                        likelihood_score, impact_score, inherent_risk_score, priority, department
                 FROM risks 
                 WHERE tenant_id = $1 AND status != $2
                 ORDER BY inherent_risk_score DESC NULLS LAST`,
                [user.tenantId, 'DELETED']
            );
            return result.rows;
        }

        // Viewer, User, Auditor: see ACTIVE risks within their tenant, or risks they own/are assigned to
        // FIX: Added parentheses to prevent cross-tenant data leak
        const result = await query(
            `SELECT risk_id, risk_code, statement, status, category, 
                    likelihood_score, impact_score, inherent_risk_score, priority, department
             FROM risks 
             WHERE tenant_id = $1 AND (status = $2 OR owner_user_id = $3 OR $3 = ANY(current_assignee_ids))
             ORDER BY inherent_risk_score DESC NULLS LAST`,
            [user.tenantId, 'ACTIVE', user.userId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter controls.
     */
    getFilteredControls: async (user: UserContext) => {
        const result = await query(
            `SELECT control_id, control_name, description, control_type, implementation_status, effectiveness_percent
             FROM controls 
             WHERE tenant_id = $1`,
            [user.tenantId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter events (incidents).
     */
    getFilteredEvents: async (user: UserContext) => {
        const result = await query(
            `SELECT event_id, event_name, event_type, severity, description, occurred_at
             FROM events 
             WHERE tenant_id = $1
             ORDER BY occurred_at DESC NULLS LAST`,
            [user.tenantId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter users based on role.
     * Admins and Risk Managers can see all users in the tenant.
     */
    getFilteredUsers: async (user: UserContext) => {
        // Only admins and risk managers can see full user list (across all tenants to match UI)
        if (['admin', 'risk_manager'].includes(user.role?.toLowerCase())) {
            const result = await query(
                `SELECT user_id, full_name, email, role, department, is_active, created_at 
                 FROM users 
                 ORDER BY full_name`
            );
            return result.rows;
        }

        // Regular users can only see their own info
        const result = await query(
            `SELECT user_id, full_name, email, role, department, is_active, created_at 
             FROM users 
             WHERE user_id = $1`,
            [user.userId]
        );
        return result.rows;
    },

    /**
     * Fetch and filter remediation plans based on role.
     * Admins/Risk Managers see all plans; users see only their assigned tasks.
     */
    getFilteredRemediationPlans: async (user: UserContext) => {
        if (['admin', 'risk_manager'].includes(user.role?.toLowerCase())) {
            const result = await query(
                `SELECT rp.plan_id, rp.action_title, rp.description, rp.status, rp.priority, rp.due_date,
                        r.risk_code, r.statement as risk_statement,
                        u.full_name as assignee_name
                 FROM remediation_plans rp
                 JOIN risks r ON rp.risk_id = r.risk_id
                 LEFT JOIN users u ON rp.owner_user_id = u.user_id
                 WHERE rp.tenant_id = $1
                 ORDER BY rp.due_date ASC NULLS LAST`,
                [user.tenantId]
            );
            return result.rows;
        }

        // Regular users: only their own assigned tasks
        const result = await query(
            `SELECT rp.plan_id, rp.action_title, rp.description, rp.status, rp.priority, rp.due_date,
                    r.risk_code, r.statement as risk_statement
             FROM remediation_plans rp
             JOIN risks r ON rp.risk_id = r.risk_id
             WHERE rp.owner_user_id = $1
             ORDER BY rp.due_date ASC NULLS LAST`,
            [user.userId]
        );
        return result.rows;
    },

    /**
     * Fetch current user's profile details from database.
     */
    getUserProfile: async (userId: string) => {
        const result = await query(
            `SELECT user_id, full_name, email, role, department FROM users WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0] || null;
    }
};
