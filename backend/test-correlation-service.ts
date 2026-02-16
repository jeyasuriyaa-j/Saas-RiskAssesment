import { query, pool, connectDatabase } from './src/database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runTest() {
    try {
        console.log('--- Database Connection Test ---');
        await connectDatabase();
        // Test database connection
        const dbResult = await query('SELECT NOW()', []);
        console.log('Database connected:', dbResult.rows[0]);

        console.log('\n--- Risk Correlation Endpoint Test ---');

        console.log('Testing generateAIResponse integration...');
        const { analyzeRiskCorrelations } = await import('./src/services/ai.service');

        // Get a tenant ID
        const tenantResult = await query('SELECT tenant_id FROM tenants LIMIT 1', []);
        if (tenantResult.rows.length === 0) {
            console.error('No tenants found in DB. Cannot test.');
            return;
        }
        const tenantId = tenantResult.rows[0].tenant_id;
        console.log('Using Tenant ID:', tenantId);

        // Run analysis
        console.log('Calling analyzeRiskCorrelations...');
        const result = await analyzeRiskCorrelations(undefined, tenantId);

        console.log('Analysis Result:', JSON.stringify(result, null, 2));

        if (result.correlations) {
            console.log('✅ Risk Correlation Test Passed (Service Layer)');
        } else {
            console.error('❌ Risk Correlation Test Failed');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

runTest();
