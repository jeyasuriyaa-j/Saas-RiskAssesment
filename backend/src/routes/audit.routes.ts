import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Export full audit trail to Excel
 * GET /api/v1/audit/export
 */
router.get('/export', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    // Fetch full history for the tenant
    const result = await query(
        `SELECT 
            rh.changed_at as "Timestamp",
            r.risk_code as "Risk Code",
            r.statement as "Risk Title",
            u.full_name as "Actor",
            rh.change_type as "Action",
            rh.field_name as "Field",
            rh.old_value as "Old Value",
            rh.new_value as "New Value",
            rh.change_reason as "Reason"
         FROM risk_history rh
         JOIN risks r ON rh.risk_id = r.risk_id
         LEFT JOIN users u ON rh.changed_by = u.user_id
         WHERE r.tenant_id = $1
         ORDER BY rh.changed_at DESC`,
        [tenantId]
    );

    // Convert to Excel
    const worksheet = XLSX.utils.json_to_sheet(result.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_trail.xlsx');

    res.send(buffer);
}));

export default router;
