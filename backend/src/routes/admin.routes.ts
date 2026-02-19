import { Router, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication and admin/risk_manager role
router.use(authenticate);

/**
 * Get Settings for Current Tenant
 * GET /admin/config
 */
router.get('/config', authorize('admin'), asyncHandler(async (_req: AuthRequest, res: Response) => {

    const configResult = await query(
        'SELECT key, value FROM system_config WHERE key IN ($1, $2, $3)',
        ['scoring', 'ai_config', 'risk_appetite']
    );

    const configs: Record<string, any> = {};
    configResult.rows.forEach((row: any) => {
        configs[row.key] = row.value;
    });

    res.json({
        risk_appetite: configs.risk_appetite?.appetite_type || 'Balanced',
        scales: configs.scoring?.scales || { likelihood: 5, impact: 5 },
        language_preference: configs.ai_config?.language_tone || 'Professional',
        api_key: configs.ai_config?.api_key || '',
        model: configs.ai_config?.model || 'gemini-1.5-flash',
        ai_features: {
            auto_mapping: configs.ai_config?.auto_mapping ?? true,
            risk_suggestion: configs.ai_config?.risk_suggestion ?? true,
            drift_detection: configs.ai_config?.drift_detection ?? true
        }
    });
}));

/**
 * Update Settings for Current Tenant
 * PUT /admin/config
 */
router.put('/config', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId, email } = req.user!;
    const { risk_appetite, scales, language_preference, ai_features, api_key, model } = req.body;

    const currentConfigResult = await query(
        'SELECT key, value FROM system_config WHERE key IN ($1, $2, $3)',
        ['scoring', 'ai_config', 'risk_appetite']
    );
    const current: Record<string, any> = {};
    currentConfigResult.rows.forEach((row: any) => current[row.key] = row.value);

    // Update global config
    await query(
        `INSERT INTO system_config (key, value) VALUES 
         ('risk_appetite', $1),
         ('scoring', $2),
         ('ai_config', $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [
            JSON.stringify({ appetite_type: risk_appetite }),
            JSON.stringify({ scales }),
            JSON.stringify({
                language_tone: language_preference,
                api_key: api_key,
                model: model,
                auto_mapping: ai_features.auto_mapping,
                risk_suggestion: ai_features.risk_suggestion,
                drift_detection: ai_features.drift_detection
            })
        ]
    );

    // Log to audit trail (still tracked per admin user/tenant)
    const changes = {
        risk_appetite: { old: current.risk_appetite || {}, new: { appetite_type: risk_appetite } },
        scales: { old: current.scoring?.scales || {}, new: scales },
        ai_config: {
            old: current.ai_config || {},
            new: {
                language_tone: language_preference,
                api_key: api_key ? '***' : '', // Mask API key in audit logs
                model: model,
                auto_mapping: ai_features.auto_mapping,
                risk_suggestion: ai_features.risk_suggestion,
                drift_detection: ai_features.drift_detection
            }
        }
    };

    await query(
        `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
         VALUES ($1, 'CONFIG', $1, 'UPDATE', $2, $3, $4)`,
        [tenantId, userId, email, JSON.stringify(changes)]
    );

    res.json({ success: true });
}));

/**
 * Get Audit Logs for Tenant Configuration
 * GET /admin/audit
 */
router.get('/audit', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, role } = req.user!;
    const { limit = 50, user_id, action, tenant_id } = req.query; // Filters

    const isAdmin = role === 'admin';
    let whereConditions = [];
    let queryParams: any[] = [];

    // 1. Tenant Filter
    if (isAdmin && tenant_id) {
        // Admin filtering by specific tenant
        whereConditions.push(`a.tenant_id = $${queryParams.length + 1}`);
        queryParams.push(tenant_id);
    } else if (!isAdmin) {
        // Non-admins locked to their own tenant
        whereConditions.push(`a.tenant_id = $${queryParams.length + 1}`);
        queryParams.push(tenantId);
    }
    // If Admin and no tenant_id provided -> Show ALL tenants (Global View)

    // 2. User Filter
    if (user_id) {
        whereConditions.push(`a.actor_user_id = $${queryParams.length + 1}`);
        queryParams.push(user_id);
    }

    // 3. Action Filter
    if (action) {
        whereConditions.push(`a.action = $${queryParams.length + 1}`);
        queryParams.push(action);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const queryText = `
        SELECT a.log_id, a.action, a.changes, a.actor_name, a.timestamp, 
               t.org_name as tenant_name, a.entity_type
        FROM audit_log a
        LEFT JOIN tenants t ON a.tenant_id = t.tenant_id
        ${whereClause}
        ORDER BY a.timestamp DESC
        LIMIT $${queryParams.length + 1}
    `;

    const result = await query(queryText, [...queryParams, Number(limit)]);

    res.json(result.rows);
}));


/**
 * Get Tenant Config (Aligned with User Spec)
 * GET /admin/tenants/{tenantId}/config
 */
router.get('/tenants/:tenantId/config', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.params;

    const result = await query(
        `SELECT tenant_id, org_name, subscription_tier, 
                risk_model_config, scoring_config, risk_appetite_config, 
                ai_config, governance_config, compliance_config 
         FROM tenants WHERE tenant_id = $1`,
        [tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Tenant not found', 404);
    }

    const tenant = result.rows[0];

    const configResponse = {
        tenant_id: tenantId,
        org_name: tenant.org_name,
        subscription_tier: tenant.subscription_tier,
        risk_model: tenant.risk_model_config || {},
        scoring_configuration: tenant.scoring_config || {},
        risk_appetite: tenant.risk_appetite_config || {},
        ai_controls: tenant.ai_config || {},
        governance_config: tenant.governance_config || {},
        compliance_config: tenant.compliance_config || {}
    };

    res.json(configResponse);
}));

/**
 * Update Tenant Config (Aligned with User Spec)
 * PUT /admin/tenants/{tenantId}/config
 */
router.put('/tenants/:tenantId/config', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.params;
    const updatePayload = req.body;

    // Get current settings
    const currentResult = await query(
        `SELECT risk_model_config, scoring_config, risk_appetite_config, 
                ai_config, governance_config, compliance_config 
         FROM tenants WHERE tenant_id = $1`,
        [tenantId]
    );

    if (currentResult.rows.length === 0) {
        throw new AppError('Tenant not found', 404);
    }

    const current = currentResult.rows[0];

    // Map top-level payload keys to specific columns
    const updates: string[] = [];
    const params: any[] = [tenantId];
    let pIdx = 2;

    const columnMap: Record<string, string> = {
        risk_model: 'risk_model_config',
        scoring_configuration: 'scoring_config',
        risk_appetite: 'risk_appetite_config',
        ai_controls: 'ai_config',
        governance_config: 'governance_config',
        compliance_config: 'compliance_config'
    };

    for (const [key, value] of Object.entries(updatePayload)) {
        const col = columnMap[key];
        if (col) {
            updates.push(`${col} = $${pIdx}`);
            // Merge with current if object
            const merged = typeof value === 'object' && value !== null
                ? { ...current[col], ...value }
                : value;
            params.push(JSON.stringify(merged));
            pIdx++;
        }
    }

    if (updates.length > 0) {
        await query(
            `UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE tenant_id = $1`,
            params
        );
    }

    res.json({ config_updated: true });
}));

/**
 * Clear pending import jobs for current tenant (login-specific)
 * DELETE /admin/import-jobs/pending
 */
router.delete('/import-jobs/pending', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    const result = await query(
        `DELETE FROM import_jobs 
         WHERE tenant_id = $1 AND status IN ('analyzing', 'processing', 'mapping')
         RETURNING job_id`,
        [tenantId]
    );

    res.json({
        message: `Cleared ${result.rowCount} pending import jobs`,
        cleared_jobs: result.rows.map((r: any) => r.job_id)
    });
}));

export default router;
