import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// List all vendors
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const result = await query(
        'SELECT * FROM vendors WHERE tenant_id = $1 ORDER BY vendor_name ASC',
        [tenantId]
    );
    res.json(result.rows);
}));

// Create vendor
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { vendor_name, category, criticality } = req.body;

    if (!vendor_name) throw new AppError('Vendor name is required', 400);

    const result = await query(
        `INSERT INTO vendors (tenant_id, vendor_name, category, criticality)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, vendor_name, category, criticality || 'MEDIUM']
    );

    res.status(201).json(result.rows[0]);
}));

// AI-Powered Vendor Assessment (Sprint 14 Feature)
router.post('/:id/assess', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const vendorRes = await query(
        'SELECT * FROM vendors WHERE vendor_id = $1 AND tenant_id = $2',
        [id, tenantId]
    );

    if (vendorRes.rows.length === 0) throw new AppError('Vendor not found', 404);

    const vendor = vendorRes.rows[0];
    const { assessVendorRisk } = await import('../services/ai.service');

    const assessment = await assessVendorRisk(vendor);

    // Auto-create incident if high-severity threat signals are found
    if (assessment.threat_signals && assessment.threat_signals.length > 0) {
        for (const signal of assessment.threat_signals) {
            if (['HIGH', 'CRITICAL'].includes(signal.severity.toUpperCase())) {
                try {
                    await query(
                        `INSERT INTO events (
                            tenant_id, event_name, event_type, description, 
                            severity, occurred_at, created_by_user_id
                        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
                        [
                            tenantId,
                            `Security Breach Detected: ${vendor.vendor_name}`,
                            'INCIDENT',
                            `Threat signal from ${signal.source}: ${signal.signal}. Auto-detected during AI assessment.`,
                            signal.severity.toUpperCase(),
                            req.user!.userId
                        ]
                    );
                } catch (err) {
                    console.error('Failed to auto-create incident for vendor breach:', err);
                }
            }
        }
    }

    const updateRes = await query(
        `UPDATE vendors 
         SET risk_score = $1, criticality = $2, assessment_data = $3, last_assessment_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $4
         RETURNING *`,
        [assessment.risk_score, assessment.generated_criticality, assessment, id]
    );

    res.json({
        message: 'AI Assessment completed',
        vendor: updateRes.rows[0]
    });
}));

// Update vendor
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const { vendor_name, category, criticality, status } = req.body;

    const result = await query(
        `UPDATE vendors 
         SET vendor_name = COALESCE($1, vendor_name), 
             category = COALESCE($2, category), 
             criticality = COALESCE($3, criticality),
             status = COALESCE($4, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $5 AND tenant_id = $6
         RETURNING *`,
        [vendor_name, category, criticality, status, id, tenantId]
    );

    if (result.rows.length === 0) throw new AppError('Vendor not found', 404);
    res.json(result.rows[0]);
}));

export default router;
