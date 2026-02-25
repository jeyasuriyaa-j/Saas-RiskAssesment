import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { analyzeExcelColumns, analyzeExcelSheetStructure, validateDataQuality, detectRiskDuplicates } from '../services/ai.service';
import {
    getAnalysisResults,
    batchAnalysisEvents,
    processBatchesHighPerf,
    bulkInsertRisksHighPerf,
    RiskInput
} from '../services/batchAnalysis.service';
import { auditService } from '../services/audit.service';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * Trigger bulk import in background
 */
export async function triggerBulkImport(jobId: string, filePath: string, tenantId: string, userId: string, validationLevel: string, previewOnly: boolean) {
    try {
        // Mark as processing
        await query('UPDATE import_jobs SET status = $1 WHERE job_id = $2', ['PROCESSING', jobId]);

        // Call the existing executeImport with default mappings or AI-derived ones
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const headers = rawRows[0] as string[];

        // Simple auto-mapping
        const fieldMap: any = {
            'statement': 'statement',
            'title': 'statement',
            'category': 'category',
            'owner': 'owner_id',
            'likelihood': 'likelihood',
            'impact': 'impact',
            'status': 'status',
            'priority': 'priority'
        };

        const columnMappings = headers.map((h, i) => {
            if (!h) return null;
            const lowerH = h.toLowerCase();
            const mapTo = Object.keys(fieldMap).find(k => lowerH.includes(k));
            return mapTo ? { excel_column: String.fromCharCode(65 + i), mapped_to_field: fieldMap[mapTo], map_to_field: fieldMap[mapTo] } : null;
        }).filter(m => m !== null);

        // Execute import
        await executeImport(jobId, filePath, columnMappings, {}, {}, tenantId, userId);

        logger.info(`Bulk import completed for job ${jobId} (Validation: ${validationLevel}, Preview: ${previewOnly})`);
    } catch (error) {
        logger.error(`Bulk import failed for job ${jobId}:`, error);
        await query('UPDATE import_jobs SET status = $1, error_log = $2 WHERE job_id = $3', ['FAILED', JSON.stringify([error]), jobId]);
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    }
});

// All routes require authentication
router.use(authenticate);

// Upload Excel file
router.post('/upload', authorize('admin', 'risk_manager', 'user'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;

    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const { originalname, path: filePath, size } = req.file;

    try {
        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Extract raw rows for structure analysis
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rawRows.length === 0) {
            throw new AppError('Excel file is empty', 400);
        }

        // Create initial job record
        const jobResult = await query(
            `INSERT INTO import_jobs (
                tenant_id, uploaded_by, file_name, file_path, file_size_bytes,
                status, total_rows
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING job_id, status, created_at`,
            [tenantId, userId, originalname, filePath, size, 'processing', rawRows.length]
        );

        const job = jobResult.rows[0];

        // Removed sleep — validation and duplicate detection now run in parallel

        // Trigger AI analysis asynchronously
        (async () => {
            try {
                // Step 1: Fast heuristic sheet selection (no AI needed)
                // Score each sheet based on its name and how many non-empty rows it has.
                const RISK_KEYWORDS = ['risk', 'register', 'incident', 'control', 'issue', 'finding', 'audit', 'threat'];
                const SKIP_KEYWORDS = ['dashboard', 'summary', 'lookup', 'data', 'chart', 'rating', 'table', 'template', 'config', 'read me'];

                let bestSheetName = workbook.SheetNames[0];
                let bestRawRows = rawRows;
                let bestScore = -1;

                for (const sName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    const nonEmptyRows = rows.filter((r: any[]) => r.some((c: any) => c !== null && c !== undefined && c !== ''));

                    if (nonEmptyRows.length < 2) continue; // Skip blank sheets

                    const lowerName = sName.toLowerCase();
                    let score = nonEmptyRows.length; // Base score = data density

                    // Boost for risk-related sheet names
                    if (RISK_KEYWORDS.some(k => lowerName.includes(k))) score += 200;
                    // Penalize dashboard/support sheets
                    if (SKIP_KEYWORDS.some(k => lowerName.includes(k))) score -= 100;

                    if (score > bestScore) {
                        bestScore = score;
                        bestSheetName = sName;
                        bestRawRows = rows;
                    }
                }

                logger.info(`Job ${job.job_id}: Using sheet "${bestSheetName}" (heuristic score: ${bestScore})`);

                // Step 2: Single AI call on the selected sheet
                let structure: any = { header_row_index: 0, relevance_score: 100 };
                try {
                    structure = await analyzeExcelSheetStructure(bestRawRows, tenantId, bestSheetName);
                } catch (e) {
                    logger.error(`AI structure analysis failed for job ${job.job_id} (using default):`, e);
                }

                // Step 2b: Heuristic override for merged/group header rows
                // If the AI picked row 0 but that row is sparse (lots of nulls),
                // scan the first 5 rows and pick the densest one as the actual header.
                let finalHeaderRowIndex = structure.header_row_index ?? 0;
                const row0 = bestRawRows[0] as any[];
                const row0NonNull = row0 ? row0.filter((c: any) => c !== null && c !== undefined && c !== '').length : 0;
                const row0Total = row0 ? row0.length : 1;
                const row0Density = row0NonNull / Math.max(row0Total, 1);

                if (finalHeaderRowIndex === 0 && row0Density < 0.5) {
                    // Row 0 is sparse — likely a merged group header. Find the densest row in first 5.
                    let bestDensity = row0Density;
                    for (let i = 1; i < Math.min(5, bestRawRows.length); i++) {
                        const row = bestRawRows[i] as any[];
                        if (!row) continue;
                        const nonNull = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
                        const density = nonNull / Math.max(row.length, 1);
                        if (density > bestDensity) {
                            bestDensity = density;
                            finalHeaderRowIndex = i;
                        }
                    }
                    logger.info(`Job ${job.job_id}: Heuristic override — using row ${finalHeaderRowIndex} as header (density: ${bestDensity.toFixed(2)})`);
                }

                // Extract headers based on the best header row
                const headerRowIndex = finalHeaderRowIndex;
                const headers = (bestRawRows[headerRowIndex] as string[]) || [];
                const sampleRows = bestRawRows.slice(headerRowIndex + 1, headerRowIndex + 6);

                const detectedColumns = headers.map((header, index) => ({
                    excel_column: String.fromCharCode(65 + index),
                    column_name: header,
                    sample_values: sampleRows.map((row: any[]) => row[index]).filter((val: any) => val !== undefined && val !== null)
                }));

                const validColumns = detectedColumns.filter(c => c.column_name && c.column_name.toString().trim() !== '');

                // Step 3: Validate and update job
                if (structure.header_row_index === null || validColumns.length === 0) {
                    const failReason = structure.header_row_index === null
                        ? 'AI could not find a header row in this sheet. Please ensure your Excel file has clear column headers (e.g., "Risk Title", "Category").'
                        : 'No valid data columns detected. The sheet appears to be empty or misformatted.';

                    logger.warn(`Job ${job.job_id}: Import failed - ${failReason}`);
                    await query(
                        `UPDATE import_jobs SET status = 'failed', error_log = $1 WHERE job_id = $2`,
                        [JSON.stringify([{ error: 'Invalid Sheet Structure', details: failReason }]), job.job_id]
                    );
                    return;
                }

                await query(
                    `UPDATE import_jobs SET layout_analysis = $1, total_rows = $2 WHERE job_id = $3`,
                    [JSON.stringify({ ...structure, detected_columns: validColumns, selected_sheet: bestSheetName }), bestRawRows.length, job.job_id]
                );

                // Step 4: AI Column Mapping
                let aiResponse = null;
                try {
                    aiResponse = await getExcelMapping(detectedColumns, tenantId, structure);
                } catch (e) {
                    logger.error(`AI column mapping failed for job ${job.job_id}:`, e);
                }

                // Update job status to 'mapping' IMMEDIATELY so frontend can proceed
                // We'll do duplicates and validation in background while frontend reviews mapping
                await query(
                    `UPDATE import_jobs 
                             SET status = $1, column_mapping = $2, mapping_confidence = $3
                             WHERE job_id = $4`,
                    ['mapping',
                        JSON.stringify(aiResponse?.mapped_fields || []),
                        aiResponse?.confidence_score || 0,
                        job.job_id]
                );
                logger.info(`Job ${job.job_id}: Transitioned to 'mapping' status.`);

                // Step 4: Run validation AND duplicate detection in PARALLEL (no more serial waits)
                let validationReport = null;
                let duplicateReportData = null;

                const [validationResult, duplicateResult] = await Promise.allSettled([
                    validateDataQuality(rawRows, tenantId),
                    (async () => {
                        // Get existing risks for this tenant
                        const existingRisksResult = await query(
                            `SELECT risk_id, risk_code, statement, description, category, 
                                 likelihood_score, impact_score, status
                          FROM risks 
                          WHERE tenant_id = $1`,
                            [tenantId]
                        );

                        // Parse incoming risks from Excel
                        const incomingHeaderRowIndex = structure.header_row_index ?? 0;
                        const dataRowsForDup = rawRows.slice(incomingHeaderRowIndex + 1);
                        const riskHeaders = rawRows[incomingHeaderRowIndex] as string[];

                        const findHeaderIndex = (keywords: string[]): number => {
                            return riskHeaders.findIndex((h: any) => {
                                if (!h || typeof h !== 'string') return false;
                                const lower = h.toLowerCase();
                                return keywords.some(kw => lower.includes(kw));
                            });
                        };

                        const incomingRisks = dataRowsForDup.slice(0, 100).map((row: any, index: number) => ({
                            risk_id: `TEMP-${index}`,
                            statement: row[findHeaderIndex(['risk', 'statement', 'title'])] || '',
                            description: row[findHeaderIndex(['description'])] || '',
                            category: row[findHeaderIndex(['category'])] || '',
                            risk_code: row[findHeaderIndex(['code'])] || ''
                        })).filter((r: any) => r.statement);

                        const allRisksForDup = [...existingRisksResult.rows, ...incomingRisks];

                        let relevantClusters: any[] = [];
                        let mergeStrategies: any[] = [];

                        if (allRisksForDup.length > 1) {
                            try {
                                const duplicateAnalysis = await detectRiskDuplicates(allRisksForDup, tenantId);
                                relevantClusters = duplicateAnalysis.duplicate_clusters.filter((cluster: any) =>
                                    (cluster.risk_ids || cluster.risks_involved || []).some((id: string) => id.startsWith('TEMP-'))
                                );

                                if (relevantClusters.length > 0) {
                                    const { generateMergeStrategies } = await import('../services/ai.service');
                                    mergeStrategies = await generateMergeStrategies(
                                        relevantClusters,
                                        existingRisksResult.rows,
                                        incomingRisks
                                    );
                                }
                            } catch (aiDupError) {
                                logger.error(`AI duplicate detection failed for job ${job.job_id} (using fallback):`, aiDupError);
                            }

                            // Fallback: Exact code + title match
                            const risksWithCodes = incomingRisks.filter((r: any) => r.risk_code);
                            logger.info(`[DEBUG] Fallback Check - Incoming risks with codes: ${risksWithCodes.length}. Total incoming: ${incomingRisks.length}. Total existing: ${existingRisksResult.rows.length}`);

                            for (const incoming of risksWithCodes) {
                                const incomingCode = (incoming.risk_code || '').toString().trim();
                                const existing = existingRisksResult.rows.find((r: any) =>
                                    (r.risk_code || '').toString().trim() === incomingCode
                                );
                                if (existing) {
                                    const tempId = incoming.risk_id;
                                    const alreadyClustered = relevantClusters.some((c: any) =>
                                        (c.risk_ids || c.risks_involved || []).includes(tempId)
                                    );
                                    if (!alreadyClustered) {
                                        const fallbackClusterId = `CODE-DUPE-${incomingCode}`;
                                        relevantClusters.push({ cluster_id: fallbackClusterId, risk_ids: [tempId, existing.risk_id], reason: `Matching Risk Code: ${incomingCode}`, confidence: 1.0, cluster_type: 'exact_code_match' });
                                        mergeStrategies.push({ cluster_id: fallbackClusterId, recommended_strategy: 'replace_existing', justification: 'Exact risk code match found in database.' });
                                    }
                                }
                            }

                            for (const incoming of incomingRisks) {
                                if (!incoming.statement) continue;
                                const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                const incomingTitleNorm = normalize(incoming.statement);
                                const existing = existingRisksResult.rows.find((r: any) =>
                                    normalize(r.statement || r.title || '') === incomingTitleNorm ||
                                    normalize(r.description || '') === incomingTitleNorm
                                );
                                if (existing) {
                                    const tempId = incoming.risk_id;
                                    const alreadyClustered = relevantClusters.some((c: any) =>
                                        (c.risk_ids || c.risks_involved || []).includes(tempId)
                                    );
                                    if (!alreadyClustered) {
                                        logger.info(`[DEBUG] TITLE MATCH: "${incoming.statement}" matches existing risk ${existing.risk_id}`);
                                        const fallbackClusterId = `TITLE-DUPE-${tempId}`;
                                        relevantClusters.push({ cluster_id: fallbackClusterId, risk_ids: [tempId, existing.risk_id], reason: `Matching Risk Title: "${existing.statement}"`, confidence: 1.0, cluster_type: 'exact_title_match' });
                                        mergeStrategies.push({ cluster_id: fallbackClusterId, recommended_strategy: 'skip_import', justification: 'Exact risk title match found in database.' });
                                    }
                                }
                            }

                            logger.info(`Duplicate detection completed for job ${job.job_id}: ${relevantClusters.length} potential duplicates found`);
                        }

                        return { clusters: relevantClusters, total_duplicates: relevantClusters.length, merge_strategies: mergeStrategies };
                    })()
                ]);

                if (validationResult.status === 'fulfilled') {
                    validationReport = validationResult.value;
                } else {
                    logger.error(`AI data validation failed for job ${job.job_id}:`, (validationResult as PromiseRejectedResult).reason);
                }

                if (duplicateResult.status === 'fulfilled') {
                    duplicateReportData = duplicateResult.value;
                } else {
                    logger.error(`Duplicate detection failed for job ${job.job_id}:`, (duplicateResult as PromiseRejectedResult).reason);
                }

                // Final Update: Set status to 'mapping' only after all analysis is done
                await query(
                    `UPDATE import_jobs 
                     SET status = CASE WHEN status = 'processing' THEN 'mapping' ELSE status END,
                         column_mapping = $1, mapping_confidence = $2, 
                         validation_report = $3, duplicate_report = $4
                     WHERE job_id = $5`,
                    [
                        JSON.stringify(aiResponse?.mapped_fields || []),
                        aiResponse?.confidence_score || 0,
                        JSON.stringify(validationReport || {}),
                        JSON.stringify(duplicateReportData || {}),
                        job.job_id
                    ]
                );

            } catch (error: any) {
                logger.error(`AI Phase 1 analysis failed for job ${job.job_id}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                await query(
                    `UPDATE import_jobs SET status = 'failed', error_log = $1 WHERE job_id = $2`,
                    [JSON.stringify([{ error: 'AI analysis failed', details: errorMessage }]), job.job_id]
                );
            }
        })();

        res.status(202).json({
            message: 'File uploaded. AI is analyzing structure and purpose...',
            job_id: job.job_id,
            file_name: originalname,
            status: 'processing'
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
}));

// Get import job status
router.get('/jobs/:jobId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    const result = await query(
        `SELECT 
      ij.*,
      u.full_name as uploaded_by_name
     FROM import_jobs ij
     LEFT JOIN users u ON ij.uploaded_by = u.user_id
     WHERE ij.job_id = $1 AND ij.tenant_id = $2`,
        [jobId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = result.rows[0];

    // Parse JSONB fields
    const response = {
        status: (job.status || 'processing').toLowerCase(),
        ai_mapping_suggestions: job.column_mapping || null,
        layout_analysis: job.layout_analysis || null,
        detected_columns: job.layout_analysis?.detected_columns || null,
        validation_report: job.validation_report || null,
        duplicate_report: job.duplicate_report || null,
        summary: {
            total_rows: job.total_rows || 0,
            imported: job.processed_rows || 0,
            created_risks: job.processed_rows || 0
        },
        error_log: job.error_log || null
    };

    res.json(response);
}));

// Get AI analysis results for a job
router.get('/jobs/:jobId/ai-analysis', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    const jobResult = await query(
        'SELECT status FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (jobResult.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const { getAnalysisResults } = require('../services/batchAnalysis.service');
    const analysisResults = await getAnalysisResults(jobId);

    res.json({
        job_id: jobId,
        status: jobResult.rows[0].status,
        analysis_results: analysisResults
    });
}));

// Get AI analysis progress for real-time polling
router.get('/jobs/:jobId/analysis-progress', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    const result = await query(
        `SELECT status, total_batches, completed_batches, failed_batches, total_rows
         FROM import_jobs 
         WHERE job_id = $1 AND tenant_id = $2`,
        [jobId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = result.rows[0];
    const totalBatches = job.total_batches || job.total_rows || 1;
    const completedBatches = job.completed_batches || 0;
    const failedBatches = job.failed_batches || 0;

    // Calculate progress percentage
    const progress = totalBatches > 0
        ? Math.min(100, Math.round((completedBatches / totalBatches) * 100))
        : 0;

    res.json({
        progress,
        total_risks: totalBatches,
        processed_risks: completedBatches,
        failed_risks: failedBatches,
        current_batch: completedBatches + 1,
        total_batches: totalBatches,
        status: job.status
    });
}));

// Confirm mapping and trigger AI analysis (don't save risks yet)
router.post('/jobs/:jobId/confirm-mapping', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;
    const { column_mappings, merge_decisions = {} } = req.body;

    if (!column_mappings || !Array.isArray(column_mappings)) {
        throw new AppError('Column mappings are required', 400);
    }

    // Get job details
    const jobResult = await query(
        'SELECT * FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (jobResult.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = jobResult.rows[0];

    if (job.status === 'completed') {
        throw new AppError('Import job already completed', 400);
    }

    // Update job status to mapping and save column mappings
    await query(
        `UPDATE import_jobs 
         SET status = 'mapping', column_mapping = $1, merge_decisions = $2
         WHERE job_id = $3`,
        [JSON.stringify(column_mappings), JSON.stringify(merge_decisions), jobId]
    );

    res.json({
        message: 'Mapping confirmed. AI will analyze risks for your review.',
        job_id: jobId,
        status: 'mapping'
    });
}));

// Finalize import - save risks after user reviews AI suggestions
router.post('/jobs/:jobId/finalize', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { jobId } = req.params;
    const { final_decisions = { accept_all_ai: true, row_decisions: {} } } = req.body;

    // Get job details
    const jobResult = await query(
        'SELECT * FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (jobResult.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = jobResult.rows[0];

    // Check if ACTUALLY completed (risks imported)
    // We have a bug/legacy issue where AI analysis sets status to 'completed', conflicting with 'import completed'
    // So we check if imported_risk_ids exists to know if it was really finalized.
    const isReallyFinalized = job.status === 'completed' && job.imported_risk_ids && job.imported_risk_ids.length > 0;

    if (isReallyFinalized) {
        throw new AppError('Import job already completed', 400);
    }

    // Allow 'analyzing' as well, in case of race/lag where frontend sees 100% but DB status update lags slightly
    // Allow 'completed' because of the bug mentioned above (if it says completed but has no imported risks, it's just analyzed)
    // Allow 'partially_analyzed' for cases where some risks have been analyzed
    const validStatuses = ['analyzed', 'analyzing', 'mapping', 'completed', 'partially_analyzed'];
    if (!validStatuses.includes(job.status)) {
        throw new AppError(`Please wait for AI analysis to complete before finalizing (Current Status: ${job.status})`, 400);
    }

    // Update status and execute import
    await query(
        'UPDATE import_jobs SET status = $1 WHERE job_id = $2',
        ['processing', jobId]
    );

    // Execute import in background with user decisions
    // Pass user's department ID to ensure risks are created in their scope
    executeImportWithDecisions(
        jobId,
        job.file_path,
        job.column_mapping || [],
        job.merge_decisions || {},
        final_decisions,
        tenantId,
        userId,
        req.user?.departmentId
    ).catch(error => {
        logger.error(`Import execution failed for job ${jobId}:`, error);
    });

    res.json({
        message: 'Import finalized. Saving risks to database...',
        job_id: jobId,
        status: 'processing'
    });
}));

// Get import results
router.get('/jobs/:jobId/results', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    const result = await query(
        'SELECT * FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = result.rows[0];

    if (job.status !== 'completed' && job.status !== 'failed') {
        throw new AppError('Import not yet completed', 400);
    }

    // Get imported risks
    let importedRisks = [];
    if (job.imported_risk_ids && job.imported_risk_ids.length > 0) {
        const risksResult = await query(
            `SELECT risk_id, risk_code, statement, inherent_risk_score
       FROM risks
       WHERE risk_id = ANY($1)`,
            [job.imported_risk_ids]
        );
        importedRisks = risksResult.rows;
    }

    res.json({
        job_id: job.job_id,
        status: job.status,
        total_rows: job.total_rows,
        processed_rows: job.processed_rows,
        failed_rows: job.failed_rows,
        imported_risks: importedRisks,
        errors: job.error_log || [],
        completed_at: job.completed_at
    });
}));

// Trigger AI detailed analysis for imported risks (High-Performance Version)
router.post('/jobs/:jobId/analyze-risks', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    // Get job details
    const jobResult = await query(
        'SELECT * FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (jobResult.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = jobResult.rows[0];

    if (job.status !== 'mapping' && job.status !== 'analyzing') {
        throw new AppError('Can only analyze risks in mapping or analyzing stage', 400);
    }

    // Update status to analyzing
    await query(
        'UPDATE import_jobs SET status = $1 WHERE job_id = $2',
        ['analyzing', jobId]
    );

    // Get optional config from request
    const { batchSize, workerCount } = req.body.config || {};

    // --- FIX: Populate analysis table before processing ---
    try {
        const layout = job.layout_analysis || {};
        const headerRowIndex = layout.header_row_index ?? 0;
        const mappings = job.column_mapping || [];

        if (mappings.length === 0) {
            logger.warn(`Job ${jobId} has no column mappings. AI analysis might be limited.`);
        }

        // Read file
        if (fs.existsSync(job.file_path)) {
            const workbook = XLSX.readFile(job.file_path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Skip header
            const dataRows = rawRows.slice(headerRowIndex + 1);

            // Map rows to RiskInput
            logger.info(`Job ${jobId}: Mappings: ${JSON.stringify(mappings)}`);
            const allMapped: RiskInput[] = dataRows.map((row, index) => {
                const getColVal = (field: string) => {
                    const map = mappings.find((m: any) => m.mapped_to_field === field);
                    if (!map) return null;
                    const colIdx = map.excel_column.toUpperCase().charCodeAt(0) - 65;
                    return row[colIdx];
                };

                const title = getColVal('risk_statement') || getColVal('statement') || getColVal('title');
                if (index === 0) {
                    logger.info(`Job ${jobId}: Sample Row 0: ${JSON.stringify(row)} -> Extracted Title: "${title}"`);
                }

                return {
                    id: index,
                    title: title || '',
                    description: getColVal('description') || '',
                    impact: parseInt(getColVal('impact') || '3'),
                    likelihood: parseInt(getColVal('likelihood') || '3'),
                    department: getColVal('category') || getColVal('department') || 'General'
                };
            });

            // CRITICAL: Filter out empty/placeholder rows
            const inputs = allMapped.filter(r => r.title && r.title.trim().length > 0);
            logger.info(`Job ${jobId}: ${dataRows.length} raw rows → ${inputs.length} non-empty rows for analysis.`);

            // Bulk insert for high performance analysis
            await bulkInsertRisksHighPerf(jobId, tenantId, inputs);
        } else {
            logger.error(`File not found for job ${jobId}: ${job.file_path}`);
        }
    } catch (prepError) {
        logger.error(`Failed to prepare data for AI analysis (Job ${jobId}):`, prepError);
        // We continue to try processing, maybe some data exists?
    }
    // -----------------------------------------------------

    // Trigger HIGH-SPEED parallel AI batch analysis in background
    // Use adaptive batch sizes based on total row count
    const totalRiskCount = job.total_rows || 0;
    const adaptiveBatchSize = batchSize || (totalRiskCount <= 50 ? 5 : totalRiskCount <= 200 ? 10 : 15);
    const adaptiveWorkerCount = workerCount || (totalRiskCount <= 50 ? 4 : totalRiskCount <= 200 ? 8 : 10);
    logger.info(`Job ${jobId}: Starting analysis with batchSize=${adaptiveBatchSize}, workers=${adaptiveWorkerCount} for ${totalRiskCount} rows`);

    processBatchesHighPerf(jobId, tenantId, totalRiskCount, {
        batchSize: adaptiveBatchSize,
        workerCount: adaptiveWorkerCount
    }).catch((error: any) => {
        logger.error(`High-speed AI analysis failed for job ${jobId}:`, error);
    });

    res.json({
        message: 'High-speed batched AI analysis started',
        job_id: jobId,
        status: 'analyzing',
        config: {
            batchSize: batchSize || 1,
            workerCount: workerCount || 1
        }
    });
}));

import { EventEmitter } from 'events';

const importEvents = new EventEmitter();
// max listeners to prevent warnings on many concurrent uploads
importEvents.setMaxListeners(50);

// Stream AI Analysis Results (SSE)
router.get('/jobs/:jobId/stream-analysis', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;

    // Verify job access
    const jobResult = await query(
        'SELECT status, ai_analysis_results FROM import_jobs WHERE job_id = $1 AND tenant_id = $2',
        [jobId, tenantId]
    );

    if (jobResult.rows.length === 0) {
        throw new AppError('Import job not found', 404);
    }

    const job = jobResult.rows[0];

    // Set SSE Headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable proxy buffering
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);

    // If job is already done, send all results and close
    if (job.status === 'analyzed' || job.status === 'completed') {
        const results = job.ai_analysis_results || [];
        res.write(`data: ${JSON.stringify({
            type: 'batch_result',
            results: results,
            progress: 100,
            completedCount: results.length,
            totalCount: job.total_batches || results.length
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
        return;
    }

    // If job is currently analyzing, push current progress immediately
    if (job.status === 'analyzing') {
        const results = await getAnalysisResults(jobId);
        const progress = job.total_batches ? Math.round((job.completed_batches / job.total_batches) * 100) : 0;
        res.write(`data: ${JSON.stringify({
            type: 'batch_result',
            results: results,
            progress: progress,
            completedCount: job.completed_batches,
            totalCount: job.total_batches
        })}\n\n`);
    }

    // Listener for new results
    const onProgress = (data: any) => {
        if (data.jobId === jobId) {
            // Send exactly what we got from the event (includes progress, results, counts)
            res.write(`data: ${JSON.stringify({ type: 'batch_result', ...data })}\n\n`);
        }
    };

    const onComplete = (data: any) => {
        if (data.jobId === jobId) {
            res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
            res.end();
            cleanup();
        }
    };

    const onError = (data: any) => {
        if (data.jobId === jobId) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: data.message })}\n\n`);
            res.end();
            cleanup();
        }
    };

    // Attach listeners to both event emitters
    importEvents.on('progress', onProgress);
    importEvents.on('complete', onComplete);
    importEvents.on('error', onError);

    // Also listen to batch analysis events from new service
    batchAnalysisEvents.on('progress', onProgress);
    batchAnalysisEvents.on('complete', onComplete);
    batchAnalysisEvents.on('error', onError);

    // Cleanup on close
    const cleanup = () => {
        importEvents.removeListener('progress', onProgress);
        importEvents.removeListener('complete', onComplete);
        importEvents.removeListener('error', onError);
        batchAnalysisEvents.removeListener('progress', onProgress);
        batchAnalysisEvents.removeListener('complete', onComplete);
        batchAnalysisEvents.removeListener('error', onError);
    };

    req.on('close', cleanup);
}));


// Helper function to convert Excel date serial number to JavaScript Date
function excelDateToJSDate(serial: number): Date | null {
    if (typeof serial !== 'number' || isNaN(serial)) {
        return null;
    }
    // Excel dates are days since 1900-01-01 (with a leap year bug)
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return dateInfo;
}

// Background function to process AI mapping
// Helper to just get the analysis
async function getExcelMapping(detectedColumns: any[], tenantId: string, _structureContext?: any) {
    try {
        return await analyzeExcelColumns(detectedColumns, tenantId);
    } catch (error) {
        throw error;
    }
}

// Background function to execute import
async function executeImport(
    jobId: string,
    filePath: string,
    columnMappings: any[],
    mergeDecisions: Record<string, string>,
    importOptions: any,
    tenantId: string,
    userId: string
) {
    const importedRiskIds: string[] = [];
    const errors: any[] = [];
    let processedRows = 0;
    let failedRows = 0;

    try {
        // Read job to get layout analysis and duplicate report
        const jobResult = await query('SELECT layout_analysis, duplicate_report FROM import_jobs WHERE job_id = $1', [jobId]);
        const jobData = jobResult.rows[0];
        const layout = jobData.layout_analysis || {};
        const duplicateReport = jobData.duplicate_report || {};
        const headerRowIndex = layout.header_row_index ?? 0;

        // Metric counters
        let newRisks = 0;
        let updatedRisks = 0;
        let skippedRisks = 0;
        let intraExcelDuplicates = 0;
        const excelRiskTracker = new Set<string>();

        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON using the detected header row
        const data = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }) as any[];

        // Get the headers from the worksheet
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const headers = rawRows[headerRowIndex] as string[];

        // Create mapping lookup from column names to fields
        const fieldMapping: any = {};
        columnMappings.forEach(mapping => {
            // Find the column name for this Excel column letter
            const columnIndex = mapping.excel_column.charCodeAt(0) - 65; // A=0, B=1, etc.
            const columnName = headers[columnIndex];
            if (columnName) {
                fieldMapping[columnName] = mapping.mapped_to_field || mapping.map_to_field;
            }
        });

        // Process each row
        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];
                const riskData: any = {};

                // Map columns to fields using column names
                Object.keys(row).forEach(columnName => {
                    const field = fieldMapping[columnName];
                    if (field) {
                        riskData[field] = row[columnName];
                    }
                });


                // Get title from mapped risk_statement or fallback to title
                const title = riskData.risk_statement || riskData.statement || riskData.title;

                // Normalize status if present
                if (riskData.status) {
                    riskData.status = normalizeRiskStatus(riskData.status);
                }

                // Detect Intra-Excel Duplicates (track but don't skip — allow override)
                const riskKey = title.trim().toLowerCase();
                if (excelRiskTracker.has(riskKey)) {
                    intraExcelDuplicates++;
                    logger.info(`Intra-excel duplicate row ${i}: ${title} — importing anyway (override mode)`);
                }
                excelRiskTracker.add(riskKey);

                // Generate risk code if not provided
                let risk_code = riskData.risk_code;
                if (!risk_code) {
                    const codeResult = await query(
                        'SELECT COUNT(*) as count FROM risks WHERE tenant_id = $1',
                        [tenantId]
                    );
                    const riskNumber = parseInt(codeResult.rows[0].count) + 1 + i;
                    risk_code = `RISK-${new Date().getFullYear()}-${String(riskNumber).padStart(3, '0')}`;
                } else {
                    // CRITICAL: Check if this risk_code already exists for this tenant to avoid constraint violation
                    const existingCodeResult = await query(
                        'SELECT risk_id FROM risks WHERE tenant_id = $1 AND risk_code = $2',
                        [tenantId, risk_code.toString().trim()]
                    );
                    if (existingCodeResult.rows.length > 0) {
                        logger.warn(`Duplicate risk_code detected in Excel: ${risk_code}. Switching to update mode for row ${i}`);
                        // Force a transition to update logic by pretending we found a duplicate by title if needed 
                        // or handles it in the insert block.
                    }
                }

                // Convert Excel date serial number to JavaScript Date if needed
                let identifiedDate: Date | null = null;
                if (riskData.identified_date) {
                    if (typeof riskData.identified_date === 'number') {
                        // Excel date serial number
                        identifiedDate = excelDateToJSDate(riskData.identified_date);
                    } else if (riskData.identified_date instanceof Date) {
                        identifiedDate = riskData.identified_date;
                    } else if (typeof riskData.identified_date === 'string') {
                        // Try parsing as string
                        const parsed = new Date(riskData.identified_date);
                        if (!isNaN(parsed.getTime())) {
                            identifiedDate = parsed;
                        }
                    }
                }

                // Insert or Update risk
                const tempId = `TEMP-${i}`;

                // Check if this row is part of a duplicate cluster
                let clusterId = null;
                if (duplicateReport.clusters) {
                    const cluster = duplicateReport.clusters.find((c: any) => c.risk_ids.includes(tempId));
                    if (cluster) {
                        clusterId = cluster.cluster_id;
                    }
                }

                // If it's a duplicate, get the strategy (User decision -> AI recommendation -> Default skip)
                let strategy = clusterId ? mergeDecisions[clusterId] : 'import_as_new';

                if (clusterId && !strategy) {
                    const strategyInfo = (duplicateReport.merge_strategies || []).find((s: any) => s.cluster_id === clusterId);
                    // Default to import_as_new so all rows are always imported
                    strategy = strategyInfo?.recommended_strategy === 'replace_existing' ? 'replace_existing' : 'import_as_new';
                    logger.info(`Using strategy '${strategy}' for cluster ${clusterId} (override mode — duplicates always imported)`);
                }

                if (strategy === 'skip_import') {
                    logger.info(`Skipping duplicate row ${i} (Cluster ${clusterId})`);
                    skippedRisks++;
                    continue;
                }

                if (strategy === 'replace_existing' || strategy === 'merge_fields') {
                    const cluster = duplicateReport.clusters.find((c: any) => c.cluster_id === clusterId);
                    const existingRiskId = cluster.risk_ids.find((id: string) => !id.startsWith('TEMP-'));

                    if (existingRiskId) {
                        // Fetch current state for audit trail "Old Value"
                        const currentRiskResult = await query(
                            'SELECT * FROM risks WHERE risk_id = $1',
                            [existingRiskId]
                        );
                        const currentRisk = currentRiskResult.rows[0] || {};

                        if (strategy === 'replace_existing') {
                            await query(
                                `UPDATE risks SET 
                          statement = $1, description = $2, category = $3,
                          likelihood_score = $4, impact_score = $5,
                          department = $6, priority = $7, identified_date = $8,
                          inherent_risk_score = $9, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
                         WHERE risk_id = $10 AND tenant_id = $11`,
                                [
                                    title, riskData.description || null, riskData.category || null,
                                    riskData.likelihood || riskData.likelihood_score || null,
                                    riskData.impact || riskData.impact_score || null,
                                    riskData.department || null, riskData.priority || null,
                                    identifiedDate || new Date(),
                                    (riskData.likelihood || riskData.likelihood_score) * (riskData.impact || riskData.impact_score) || null,
                                    existingRiskId, tenantId
                                ]
                            );
                            logger.info(`Replaced existing risk ${existingRiskId} with row ${i}`);
                        } else {
                            // merge_fields: Simple implementation - only update if incoming is not null
                            await query(
                                `UPDATE risks SET 
                          statement = COALESCE($1, statement), 
                          description = COALESCE($2, description), 
                          category = COALESCE($3, category),
                          department = COALESCE($4, department), 
                          priority = COALESCE($5, priority),
                          updated_at = CURRENT_TIMESTAMP
                         WHERE risk_id = $6 AND tenant_id = $7`,
                                [
                                    title, riskData.description || null, riskData.category || null,
                                    riskData.department || null, riskData.priority || null,
                                    existingRiskId, tenantId
                                ]
                            );
                            logger.info(`Merged fields into existing risk ${existingRiskId} from row ${i}`);
                        }

                        // Log to audit history with BEFORE & AFTER
                        await auditService.logChange({
                            risk_id: existingRiskId,
                            changed_by: userId,
                            change_type: 'updated',
                            change_reason: `Updated via bulk import (Job: ${jobId})`,
                            old_value: JSON.stringify(currentRisk),
                            new_value: JSON.stringify(riskData)
                        });

                        updatedRisks++;
                        processedRows++;
                        continue;
                    }
                }

                const result = await query(
                    `INSERT INTO risks (
            tenant_id, risk_code, statement, description, category,
            likelihood_score, impact_score, inherent_risk_score, owner_user_id,
            department, status, priority, identified_date, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (tenant_id, risk_code) DO UPDATE SET
            statement = EXCLUDED.statement,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            likelihood_score = EXCLUDED.likelihood_score,
            impact_score = EXCLUDED.impact_score,
            inherent_risk_score = EXCLUDED.inherent_risk_score,
            department = EXCLUDED.department,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP
          RETURNING risk_id`,
                    [
                        tenantId,
                        risk_code,
                        title,
                        riskData.description || null,
                        riskData.category || null,
                        riskData.likelihood || riskData.likelihood_score || null,
                        riskData.impact || riskData.impact_score || null,
                        (riskData.likelihood || riskData.likelihood_score) * (riskData.impact || riskData.impact_score) || null,
                        importOptions.default_owner_id || userId,
                        riskData.department || null,
                        riskData.status || 'DRAFT',
                        riskData.priority || 'MEDIUM',
                        identifiedDate || new Date(),
                        userId
                    ]
                );

                const newRiskId = result.rows[0].risk_id;
                importedRiskIds.push(newRiskId);

                // Log to audit history
                await auditService.logChange({
                    risk_id: newRiskId,
                    changed_by: userId,
                    change_type: 'created',
                    change_reason: `Created via bulk import (Job: ${jobId})`,
                    new_value: JSON.stringify(riskData)
                });

                newRisks++;
                processedRows++;
            } catch (error: any) {
                failedRows++;
                errors.push({
                    row_number: i + 2, // +2 because Excel is 1-indexed and has header row
                    error: error.message,
                    row_data: data[i]
                });
            }
        }

        // Update job as completed with detailed summary
        const summary = {
            total_rows: data.length,
            processed_rows: processedRows,
            new_risks: newRisks,
            updated_risks: updatedRisks,
            skipped_risks: skippedRisks,
            intra_excel_duplicates: intraExcelDuplicates,
            failed_rows: failedRows
        };

        await query(
            `UPDATE import_jobs 
       SET status = $1, processed_rows = $2, failed_rows = $3,
           imported_risk_ids = $4, error_log = $5, 
           duplicate_report = duplicate_report || $6::jsonb,
           completed_at = CURRENT_TIMESTAMP
       WHERE job_id = $7`,
            ['completed', processedRows, failedRows, importedRiskIds, JSON.stringify(errors), JSON.stringify({ summary }), jobId]
        );

        logger.info(`Import completed for job ${jobId}: ${processedRows} succeeded, ${failedRows} failed`);

        // Audit log
        await auditService.logAction({
            tenant_id: tenantId,
            entity_type: 'IMPORT',
            entity_id: jobId,
            action: 'BULK_IMPORT_COMPLETED',
            actor_user_id: userId,
            changes: summary
        });

        // Clean up file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        logger.error(`Import execution error for job ${jobId}:`, error);
        await query(
            `UPDATE import_jobs 
       SET status = $1, error_log = $2, completed_at = CURRENT_TIMESTAMP
       WHERE job_id = $3`,
            ['failed', JSON.stringify([{ error: 'Import failed', details: error }]), jobId]
        );
    }
}

/**
 * Execute import with user decisions on AI analysis results
 * This function handles the final import after user has reviewed AI suggestions
 */
async function executeImportWithDecisions(
    jobId: string,
    filePath: string,
    columnMappings: any[],
    mergeDecisions: Record<string, string>,
    finalDecisions: { accept_all_ai?: boolean; row_decisions?: Record<string, string> },
    tenantId: string,
    userId: string,
    userDepartmentId?: string
) {
    const importedRiskIds: string[] = [];
    const errors: any[] = [];
    let processedRows = 0;
    let failedRows = 0;

    try {
        // Read job to get AI analysis results
        const jobResult = await query(
            'SELECT layout_analysis, ai_analysis_results, duplicate_report FROM import_jobs WHERE job_id = $1',
            [jobId]
        );
        const jobData = jobResult.rows[0];
        const layout = jobData.layout_analysis || {};
        const aiAnalysisResults = jobData.ai_analysis_results || {};
        const headerRowIndex = layout.header_row_index ?? 0;

        // Metric counters
        let newRisks = 0;
        let updatedRisks = 0;
        let skippedRisks = 0;
        let intraExcelDuplicates = 0;
        const excelRiskTracker = new Set<string>();

        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON using the detected header row
        const data = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }) as any[];

        // Get the headers from the worksheet
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const headers = rawRows[headerRowIndex] as string[];

        // Create mapping lookup from column names to fields
        const fieldMapping: any = {};
        columnMappings.forEach(mapping => {
            const columnIndex = mapping.excel_column?.charCodeAt(0) - 65;
            const columnName = headers[columnIndex];
            if (columnName && (mapping.mapped_to_field || mapping.map_to_field)) {
                fieldMapping[columnName] = mapping.mapped_to_field || mapping.map_to_field;
            }
        });

        // Process in batches for performance
        const BATCH_SIZE = 50;
        let batchPromises = [];

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const batchStartIndex = i;

            const processRow = async (rowIndexOffset: number, row: any) => {
                const rowIndex = batchStartIndex + rowIndexOffset + 1; // Excel row numbers are 1-indexed
                const riskData: any = {};

                // Map columns to fields using column names
                Object.keys(row).forEach(columnName => {
                    const field = fieldMapping[columnName];
                    if (field) {
                        riskData[field] = row[columnName];
                    }
                });

                // Get title from mapped risk_statement or fallback
                // If title is missing, try to use description (truncated) or fallback to generic name to allow AI to fix it
                let title = riskData.risk_statement || riskData.statement || riskData.title;

                if (!title) {
                    if (riskData.description) {
                        title = riskData.description.substring(0, 50) + (riskData.description.length > 50 ? '...' : '');
                    } else if (riskData.risk_code || riskData.risk_id) {
                        title = `Risk ${riskData.risk_code || riskData.risk_id}`;
                    } else {
                        title = `Risk ${i + 1}`;
                    }
                }

                // Normalize status if present
                if (riskData.status) {
                    riskData.status = normalizeRiskStatus(riskData.status);
                }

                // Detect Intra-Excel Duplicates
                const riskKey = title?.trim().toLowerCase();
                if (!riskKey) {
                    failedRows++;
                    errors.push({ row_number: rowIndex, error: 'Missing title/statement', row_data: row });
                    return;
                }

                if (excelRiskTracker.has(riskKey)) {
                    intraExcelDuplicates++;
                    logger.info(`Intra-excel duplicate row ${rowIndex}: ${title} — importing anyway (override mode)`);
                }
                excelRiskTracker.add(riskKey);

                // Check AI analysis decision for this row
                const rowDecisions = (finalDecisions as any).row_decisions as Record<string, string> || {};
                let rowDecision = rowDecisions[`row_${rowIndex - 1}`] || (title ? rowDecisions[title] : undefined);

                // Fallback to global AI acceptance if not specified
                if (!rowDecision && finalDecisions.accept_all_ai) {
                    rowDecision = 'ai';
                }

                rowDecision = rowDecision || 'original';
                const aiAnalysis = Array.isArray(aiAnalysisResults)
                    ? aiAnalysisResults.find((r: any) => r.row_index === (rowIndex - 1))
                    : (aiAnalysisResults as any)[`row_${rowIndex - 1}`] || (title ? (aiAnalysisResults as any)[title] : undefined);

                let finalStatement = title;
                let finalDescription = riskData.description;
                let finalCategory = riskData.category;
                let finalLikelihood = riskData.likelihood || riskData.likelihood_score;
                let finalImpact = riskData.impact || riskData.impact_score;

                // Apply AI improvements if user chose to accept them
                if (aiAnalysis && rowDecision === 'ai') {
                    finalStatement = aiAnalysis.ai_analysis?.improved_statement || title;
                    finalDescription = aiAnalysis.ai_analysis?.improved_description || riskData.description;
                    finalCategory = aiAnalysis.ai_analysis?.suggested_category || riskData.category;
                    finalLikelihood = aiAnalysis.ai_analysis?.score_analysis?.suggested_likelihood || finalLikelihood;
                    finalImpact = aiAnalysis.ai_analysis?.score_analysis?.suggested_impact || finalImpact;
                    logger.info(`Applied AI improvements for row ${rowIndex}: ${finalStatement}`);
                }

                // Skip if decision is to reject this row
                if (rowDecision === 'skip') {
                    skippedRisks++;
                    logger.info(`Skipping row ${rowIndex} per user decision: ${title}`);
                    return;
                }

                // Generate risk code
                let risk_code = riskData.risk_code;
                if (!risk_code) {
                    const codeResult = await query(
                        'SELECT COUNT(*) as count FROM risks WHERE tenant_id = $1',
                        [tenantId]
                    );
                    const riskNumber = parseInt(codeResult.rows[0].count) + 1 + i;
                    risk_code = `RISK-${new Date().getFullYear()}-${String(riskNumber).padStart(3, '0')}`;
                }

                // Handle date conversion
                let identifiedDate: Date | null = null;
                if (riskData.identified_date) {
                    if (typeof riskData.identified_date === 'number') {
                        identifiedDate = excelDateToJSDate(riskData.identified_date);
                    } else if (riskData.identified_date instanceof Date) {
                        identifiedDate = riskData.identified_date;
                    } else {
                        const parsed = new Date(riskData.identified_date);
                        identifiedDate = !isNaN(parsed.getTime()) ? parsed : null;
                    }
                }

                if (!mergeDecisions['skip_duplicate_check']) {
                    const dupeResult = await query(
                        `SELECT risk_id, statement FROM risks 
                         WHERE tenant_id = $1 AND LOWER(TRIM(statement)) = $2
                         LIMIT 1`,
                        [tenantId, riskKey]
                    );

                    if (dupeResult.rows.length > 0) {
                        const existingRisk = dupeResult.rows[0];
                        const existingId = existingRisk.risk_id;
                        const mergeDecision = mergeDecisions[existingRisk.statement] || mergeDecisions[riskKey];

                        if (mergeDecision === 'skip') {
                            skippedRisks++;
                            return;
                        }

                        // Default behavior: update (override) the existing risk
                        const shouldUpdate = mergeDecision === 'update' || !mergeDecision;
                        if (shouldUpdate) {
                            await query(
                                `UPDATE risks SET
                                    description = COALESCE($1, description),
                                    category = COALESCE($2, category),
                                    likelihood_score = COALESCE($3, likelihood_score),
                                    impact_score = COALESCE($4, impact_score),
                                    inherent_risk_score = COALESCE($5, inherent_risk_score),
                                    owner_user_id = COALESCE($6, owner_user_id),
                                    department = COALESCE($7, department),
                                    department_id = COALESCE($8, department_id),
                                    status = COALESCE($9, status),
                                    priority = COALESCE($10, priority),
                                    identified_date = COALESCE($11, identified_date),
                                    updated_at = CURRENT_TIMESTAMP
                                 WHERE risk_id = $12`,
                                [
                                    finalDescription,
                                    finalCategory,
                                    finalLikelihood,
                                    finalImpact,
                                    (finalLikelihood || 0) * (finalImpact || 0),
                                    riskData.owner_user_id || null,
                                    riskData.department || null,
                                    userDepartmentId || null, // $8
                                    riskData.status || 'DRAFT',
                                    riskData.priority || 'MEDIUM',
                                    identifiedDate,
                                    existingId
                                ]
                            );

                            await auditService.logChange({
                                risk_id: existingId,
                                changed_by: userId,
                                change_type: 'updated',
                                change_reason: `Updated via bulk import with AI review (Job: ${jobId})`,
                                old_value: JSON.stringify({ statement: existingRisk.statement }),
                                new_value: JSON.stringify({ statement: finalStatement, description: finalDescription, ai_improved: rowDecision === 'ai' })
                            });

                            importedRiskIds.push(existingId);
                            updatedRisks++;
                            processedRows++;
                            return;
                        }
                    }
                }

                const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                const finalOwnerId = (riskData.owner_user_id && isValidUUID(riskData.owner_user_id)) ? riskData.owner_user_id : userId;

                // Insert new risk
                const result = await query(
                    `INSERT INTO risks (
                        tenant_id,      -- 1
                        risk_code,      -- 2
                        statement,      -- 3
                        description,    -- 4
                        category,       -- 5
                        likelihood_score, -- 6
                        impact_score,   -- 7
                        inherent_risk_score, -- 8
                        owner_user_id,  -- 9
                        department,     -- 10
                        department_id,  -- 11
                        status,         -- 12
                        priority,       -- 13
                        identified_date, -- 14
                        created_by      -- 15
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING risk_id`,
                    [
                        tenantId, // $1
                        risk_code, // $2
                        finalStatement, // $3
                        finalDescription || null, // $4
                        finalCategory || null, // $5
                        finalLikelihood || null, // $6
                        finalImpact || null, // $7
                        (finalLikelihood || 0) * (finalImpact || 0) || null, // $8
                        finalOwnerId, // $9
                        riskData.department || null, // $10
                        userDepartmentId || null, // $11
                        riskData.status || 'DRAFT', // $12
                        riskData.priority || 'MEDIUM', // $13
                        identifiedDate || new Date(), // $14
                        userId // $15
                    ]
                );

                const newRiskId = result.rows[0].risk_id;
                importedRiskIds.push(newRiskId);

                await auditService.logChange({
                    risk_id: newRiskId,
                    changed_by: userId,
                    change_type: 'created',
                    change_reason: `Created via bulk import with AI review (Job: ${jobId})`,
                    new_value: JSON.stringify({ statement: finalStatement, ai_improved: rowDecision === 'ai' })
                });

                newRisks++;
                processedRows++;
            };

            batchPromises = batch.map((row, indexOffset) =>
                processRow(indexOffset, row).catch(error => {
                    failedRows++;
                    errors.push({
                        row_number: batchStartIndex + indexOffset + 2,
                        error: error.message,
                        row_data: row
                    });
                })
            );

            await Promise.all(batchPromises);
        }

        // Update job as completed
        const summary = {
            total_rows: data.length,
            processed_rows: processedRows,
            new_risks: newRisks,
            updated_risks: updatedRisks,
            skipped_risks: skippedRisks,
            intra_excel_duplicates: intraExcelDuplicates,
            failed_rows: failedRows,
            ai_reviewed: Object.keys(finalDecisions.row_decisions || {}).filter(k => k.startsWith('row_') || (finalDecisions.row_decisions || {})[k] === 'ai').length
        };

        await query(
            `UPDATE import_jobs 
             SET status = $1, processed_rows = $2, failed_rows = $3,
                 imported_risk_ids = $4, error_log = $5, 
                 duplicate_report = duplicate_report || $6::jsonb,
                 completed_at = CURRENT_TIMESTAMP
             WHERE job_id = $7`,
            ['completed', processedRows, failedRows, importedRiskIds, JSON.stringify(errors), JSON.stringify({ summary }), jobId]
        );

        logger.info(`Import with AI decisions completed for job ${jobId}: ${processedRows} succeeded, ${failedRows} failed, ${newRisks} new`);

        await auditService.logAction({
            tenant_id: tenantId,
            entity_type: 'IMPORT',
            entity_id: jobId,
            action: 'BULK_IMPORT_WITH_AI_REVIEW_COMPLETED',
            actor_user_id: userId,
            changes: summary
        });

        // Clean up file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        logger.error(`Import with AI decisions failed for job ${jobId}:`, error);
        await query(
            `UPDATE import_jobs 
             SET status = $1, error_log = $2, completed_at = CURRENT_TIMESTAMP
             WHERE job_id = $3`,
            ['failed', JSON.stringify([{ error: 'Import failed', details: String(error) }]), jobId]
        );
    }
}

/**
 * Normalizes risk status from common Excel strings to database-compatible enum values
 */
function normalizeRiskStatus(status: any): string {
    if (!status) return 'DRAFT';

    const normalized = status.toString().trim().toLowerCase();

    // Mapping: ACTIVE
    if (['active', 'in progress', 'ongoing', 'monitoring', 'in-progress'].includes(normalized)) {
        return 'ACTIVE';
    }

    // Mapping: MITIGATED
    if (['mitigated', 'completed', 'done', 'fixed', 'resolved'].includes(normalized)) {
        return 'MITIGATED';
    }

    // Mapping: CLOSED
    if (['closed', 'archived', 'inactive'].includes(normalized)) {
        return 'CLOSED';
    }

    // Mapping: IDENTIFIED / ASSESSED
    if (normalized === 'identified') return 'IDENTIFIED';
    if (normalized === 'assessed') return 'ASSESSED';
    if (normalized === 'accepted') return 'ACCEPTED';

    // Default to DRAFT for anything else unknown or draft-like
    return 'DRAFT';
}

export default router;
