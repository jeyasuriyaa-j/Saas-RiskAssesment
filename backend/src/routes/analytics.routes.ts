import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getDashboardMetrics, getRiskHeatmap } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

// Get Dashboard Metrics
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { tenantId, userId, role } = req.user!;
        const metrics = await getDashboardMetrics(tenantId, userId, role);
        res.json({
            status: 'success',
            data: metrics
        });
    } catch (error) {
        logger.error('Failed to get dashboard metrics:', error);
        res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
    }
});

// Get Risk Heatmap
router.get('/heatmap', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { tenantId, userId, role } = req.user!;
        const heatmap = await getRiskHeatmap(tenantId, userId, role);
        res.json({
            status: 'success',
            data: heatmap
        });
    } catch (error) {
        logger.error('Failed to get risk heatmap:', error);
        res.status(500).json({ error: 'Failed to retrieve risk heatmap' });
    }
});

// Get Board Summary
router.get('/board-summary', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { tenantId, userId, role } = req.user!;
        const { getBoardSummary } = require('../services/analytics.service');
        const summary = await getBoardSummary(tenantId, userId, role);
        res.json({
            status: 'success',
            data: summary
        });
    } catch (error) {
        logger.error('Failed to get board summary:', error);
        res.status(500).json({ error: 'Failed to retrieve board summary' });
    }
});

export default router;
