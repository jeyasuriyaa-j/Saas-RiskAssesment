import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { connectDatabase } from './src/database/connection';
import { generateAIResponse } from './src/services/ai.service';

async function testAI() {
    try {
        console.log('Connecting to database to fetch AI config...');
        await connectDatabase();

        console.log('Testing AI with current configuration...');
        const response = await generateAIResponse('Hello, are you there? Reply with "READY"');
        console.log('AI_RESPONSE:', response);
        process.exit(0);
    } catch (error) {
        console.error('AI_ERROR:', error);
        process.exit(1);
    }
}

testAI();
