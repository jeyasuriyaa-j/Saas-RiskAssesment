import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/evidence');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload evidence
router.post('/upload', upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId, email } = req.user!;
    const { controlId, riskId, description, tags } = req.body;
    const file = req.file;

    if (!file) throw new AppError('No file uploaded', 400);
    if (!controlId && !riskId) {
        // Clean up file if metadata missing
        fs.unlinkSync(file.path);
        throw new AppError('Control ID or Risk ID is required', 400);
    }

    // Verify ownership if controlId provided
    if (controlId) {
        const controlCheck = await query(
            'SELECT * FROM controls WHERE control_id = $1 AND tenant_id = $2',
            [controlId, tenantId]
        );
        if (controlCheck.rows.length === 0) {
            fs.unlinkSync(file.path);
            throw new AppError('Control not found', 404);
        }
    }

    // Verify ownership if riskId provided
    if (riskId) {
        const riskCheck = await query(
            'SELECT * FROM risks WHERE (risk_id = $1 OR risk_code = $1) AND tenant_id = $2',
            [riskId, tenantId]
        );
        if (riskCheck.rows.length === 0) {
            fs.unlinkSync(file.path);
            throw new AppError('Risk not found', 404);
        }
    }

    const { taskId } = req.body;
    let finalPlanId = null;

    if (taskId) {
        const taskResult = await query(
            `SELECT rp.plan_id FROM remediation_plans rp 
             JOIN risks r ON rp.risk_id = r.risk_id
             WHERE (rp.plan_id = $1 OR r.risk_code = $1) AND rp.tenant_id = $2`,
            [taskId, tenantId]
        );
        if (taskResult.rows.length > 0) {
            finalPlanId = taskResult.rows[0].plan_id;
        }
    }

    const result = await query(
        `INSERT INTO evidence (
            tenant_id, control_id, risk_id, file_name, file_path, file_size_bytes, file_type, uploaded_by, description, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
            tenantId,
            controlId || null,
            riskId || null,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            userId,
            description || null,
            tags ? (Array.isArray(tags) ? tags : [tags]) : null
        ]
    );

    const newEvidence = result.rows[0];

    // If it's a task, also sync with task_files
    if (finalPlanId) {
        await query(
            `INSERT INTO task_files (task_id, file_name, file_path, file_size, mime_type, uploaded_by, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [finalPlanId, file.originalname, file.path, file.size, file.mimetype, userId, tenantId]
        );
    }

    // Log audit
    const { auditService } = await import('../services/audit.service');
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'EVIDENCE',
        entity_id: newEvidence.evidence_id,
        action: 'CREATE',
        actor_user_id: userId,
        actor_name: email,
        changes: { file_name: file.originalname, controlId, riskId, taskId }
    });

    res.status(201).json(newEvidence);
}));

// List evidence for a control
router.get('/control/:controlId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { controlId } = req.params;

    const result = await query(
        'SELECT * FROM evidence WHERE control_id = $1 AND tenant_id = $2 ORDER BY uploaded_at DESC',
        [controlId, tenantId]
    );

    res.json(result.rows);
}));

// Delete evidence
router.delete('/:evidenceId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { evidenceId } = req.params;

    const check = await query(
        'SELECT * FROM evidence WHERE id = $1 AND tenant_id = $2',
        [evidenceId, tenantId]
    );

    if (check.rows.length === 0) throw new AppError('Evidence not found', 404);

    const fileData = check.rows[0];

    // Delete from DB
    await query('DELETE FROM evidence WHERE id = $1', [evidenceId]);

    // Delete file from disk
    if (fs.existsSync(fileData.file_path)) {
        fs.unlinkSync(fileData.file_path);
    }

    res.status(204).send();
}));

export default router;
