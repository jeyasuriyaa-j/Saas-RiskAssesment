import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { connectDatabase } from './src/database/connection';
import { generateAIResponse } from './src/services/ai.service';
import * as performance from 'perf_hooks';

async function measureLatency() {
    try {
        await connectDatabase();

        console.log('--- AI Latency Test ---');
        const start = performance.performance.now();

        const response = await generateAIResponse('Provide a brief 1-sentence risk assessment for a data breach.');

        const end = performance.performance.now();
        const duration = (end - start) / 1000;

        console.log('\nAI_RESPONSE:', response.trim());
        console.log(`\nLATENCY: ${duration.toFixed(3)} seconds`);

        process.exit(0);
    } catch (error) {
        console.error('AI_ERROR:', error);
        process.exit(1);
    }
}

measureLatency();
