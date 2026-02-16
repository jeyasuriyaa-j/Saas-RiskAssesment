
import { analyzeSingleRisk } from '../services/ai.service';
import { connectDatabase, query } from '../database/connection';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugAnalysis() {
    console.log('Testing AI Analysis with model:', process.env.AI_MODEL);

    try {
        await connectDatabase();

        // Fetch a real tenant ID to avoid UUID errors
        const tenantResult = await query('SELECT tenant_id FROM tenants LIMIT 1');
        const tenantId = tenantResult.rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000000';
        console.log('Using Tenant ID:', tenantId);

        const sampleRisk = {
            statement: "Data Breach from Unauthorized Access",
            description: "Sensitive customer data could be accessed by unauthorized personnel due to weak access controls",
            category: "Cybersecurity",
            likelihood: 4,
            impact: 9
        };

        console.log('Sending request...');
        const result = await analyzeSingleRisk(1, sampleRisk, tenantId);

        console.log('--- ANALYSIS RESULT ---');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        console.log('Done.');
        process.exit(0);
    }
}

debugAnalysis();
