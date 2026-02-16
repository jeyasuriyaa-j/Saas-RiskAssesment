import { query, connectDatabase } from '../database/connection';
import { detectRiskDuplicates } from '../services/ai.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runDeduplication() {
    try {
        await connectDatabase();
        const tenantId = 'e81a81fd-e2c9-47e4-8d4b-7b58ad907e31'; // First tenant ID

        // Fetch risks from database
        const risksResult = await query(
            'SELECT risk_id, risk_code, statement, description, owner_user_id, department FROM risks WHERE tenant_id = $1',
            [tenantId]
        );

        const risks = risksResult.rows;

        if (risks.length === 0) {
            console.log("No risks found for this tenant.");
            return;
        }

        console.error(`Analyzing ${risks.length} risks for duplicates...`);

        const report = await detectRiskDuplicates(risks, tenantId);

        console.log(JSON.stringify(report, null, 2));

    } catch (error) {
        console.error("Deduplication run failed:", error);
        process.exit(1);
    }
}

runDeduplication();
