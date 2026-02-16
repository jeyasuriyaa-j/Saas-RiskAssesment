import { query, connectDatabase } from '../database/connection';
import { evaluateControlEffectiveness } from '../services/ai.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runEvaluation() {
    console.error("Starting evaluation run...");
    try {
        await connectDatabase();
        const tenantId = 'e81a81fd-e2c9-47e4-8d4b-7b58ad907e31';
        const riskCode = 'RISK-2026-002';

        // Fetch risk details
        const riskResult = await query(
            'SELECT * FROM risks WHERE risk_code = $1 AND tenant_id = $2',
            [riskCode, tenantId]
        );

        if (riskResult.rows.length === 0) {
            console.log(`Risk ${riskCode} not found.`);
            return;
        }
        const risk = riskResult.rows[0];

        // Fetch associated controls
        const controlsResult = await query(
            `SELECT c.*, rc.mitigation_percentage 
             FROM controls c
             JOIN risk_controls rc ON c.control_id = rc.control_id
             WHERE rc.risk_id = $1`,
            [risk.risk_id]
        );

        const controls = controlsResult.rows;

        if (controls.length === 0) {
            console.log(`No controls mapped to risk ${riskCode}.`);
            return;
        }

        console.error(`Evaluating effectiveness for Risk ${riskCode} and its ${controls.length} controls...`);

        const report = await evaluateControlEffectiveness(risk, controls);

        console.log(JSON.stringify(report, null, 2));

    } catch (error) {
        console.error("Evaluation run failed:", error);
        process.exit(1);
    }
}

runEvaluation();
