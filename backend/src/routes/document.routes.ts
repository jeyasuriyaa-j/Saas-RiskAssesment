import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { analyzeDocument } from '../services/ai.service';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/documents/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'text/plain', // .txt
            'text/markdown', // .md
            'application/pdf', // .pdf
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        ];

        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv|txt|md|pdf|docx)$/)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'));
        }
    },
});

/**
 * POST /api/v1/documents/analyze
 * Upload and analyze any document with AI
 */
router.post('/analyze', authenticate, authorize('admin', 'risk_manager', 'user'), upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'NO_FILE',
                    message: 'No file uploaded',
                },
            });
        }

        const { originalname, mimetype, path: filePath } = req.file;
        logger.info(`Analyzing document: ${originalname}`);

        let fileContent = '';
        const fileExtension = path.extname(originalname).toLowerCase();

        // Extract content based on file type
        if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            // Parse Excel file
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON for analysis
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            fileContent = JSON.stringify(jsonData, null, 2);
        } else if (fileExtension === '.csv') {
            // Parse CSV file
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            fileContent = JSON.stringify(jsonData, null, 2);
        } else if (fileExtension === '.txt' || fileExtension === '.md') {
            // Read text files directly
            fileContent = await fs.readFile(filePath, 'utf-8');
        } else if (fileExtension === '.pdf') {
            // For PDF, we'd need a PDF parser library
            // For now, return a message that PDF parsing is not yet implemented
            await fs.unlink(filePath); // Clean up uploaded file
            return res.status(400).json({
                error: {
                    code: 'PDF_NOT_SUPPORTED',
                    message: 'PDF analysis is not yet implemented. Please use Excel, CSV, or text files.',
                },
            });
        } else if (fileExtension === '.docx') {
            // For DOCX, we'd need a DOCX parser library
            await fs.unlink(filePath); // Clean up uploaded file
            return res.status(400).json({
                error: {
                    code: 'DOCX_NOT_SUPPORTED',
                    message: 'Word document analysis is not yet implemented. Please use Excel, CSV, or text files.',
                },
            });
        } else {
            // Try reading as text
            fileContent = await fs.readFile(filePath, 'utf-8');
        }

        // Analyze with AI
        const analysis = await analyzeDocument(fileContent, originalname, mimetype);

        // Clean up uploaded file
        await fs.unlink(filePath);

        logger.info(`Document analysis completed for: ${originalname}`);

        res.json({
            success: true,
            file_name: originalname,
            file_type: mimetype,
            analysis,
        });
        return;
    } catch (error: any) {
        logger.error('Document analysis error:', error);

        // Clean up file if it exists
        if (req.file?.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('Failed to clean up file:', unlinkError);
            }
        }

        res.status(500).json({
            error: {
                code: 'ANALYSIS_FAILED',
                message: error.message || 'Failed to analyze document',
            },
        });
        return;
    }
});

export default router;
