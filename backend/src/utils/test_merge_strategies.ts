import { generateMergeStrategies } from '../services/ai.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testMergeStrategies() {
    const existingRisks = [
        {
            risk_id: 'risk-001',
            risk_code: 'RISK-001',
            statement: 'Data validation failure',
            description: 'Database entries are not validated correctly',
            likelihood_score: 3,
            impact_score: 4,
            category: 'Technology',
            status: 'OPEN'
        }
    ];

    const incomingRisks = [
        {
            risk_id: 'TEMP-001',
            statement: 'Failure in data validation',
            description: 'Validation logic is missing for some fields',
            likelihood: 4,
            impact: 4,
            category: 'Tech'
        }
    ];

    const duplicateClusters = [
        {
            cluster_id: 'CL-001',
            risk_ids: ['risk-001', 'TEMP-001'],
            similarity_score: 85,
            cluster_type: 'semantic_duplicate'
        }
    ];

    console.log('Testing merge strategies...');
    const strategies = await generateMergeStrategies(duplicateClusters, existingRisks, incomingRisks);
    console.log(JSON.stringify(strategies, null, 2));
}

testMergeStrategies();
