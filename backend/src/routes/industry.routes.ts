import express from 'express';
import { IndustryRiskModel } from '../models/industry_risk.model';
import { BenchmarkModel } from '../models/benchmark.model';
import { FederatedLearningService } from '../services/federated_learning.service';
import { authenticate } from '../middleware/auth'; // Assuming this exists

const router = express.Router();

// Get all industry risks (for library)
router.get('/risks', authenticate, async (req, res) => {
    try {
        const category = req.query.category as string;
        let risks;
        if (category) {
            risks = await IndustryRiskModel.getByCategory(category);
        } else {
            risks = await IndustryRiskModel.getAll();
        }
        res.json(risks);
    } catch (error) {
        console.error('Error fetching industry risks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get benchmarks for a specific industry
router.get('/benchmarks', authenticate, async (req: any, res) => {
    try {
        // In a real app, we'd get the industry from the tenant's profile
        // For now, we'll allow passing it as a query param or default to 'Global'
        const industry = (req.query.industry as string) || 'Global';

        const benchmarks = await BenchmarkModel.getByIndustry(industry);
        res.json(benchmarks);
    } catch (error) {
        console.error('Error fetching benchmarks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Trigger aggregation (Admin only or scheduled)
// In prod, protect this with an admin check
router.post('/aggregate', authenticate, async (_req, res) => {
    try {
        await FederatedLearningService.aggregateBenchmarks();
        res.json({ message: 'Aggregation started.' });
    } catch (error) {
        console.error('Error running aggregation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
