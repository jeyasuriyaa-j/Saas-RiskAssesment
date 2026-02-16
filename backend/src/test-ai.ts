import { generateAIResponse } from './services/ai.service';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testAI() {
    try {
        console.log(`Testing AI Service with model: ${process.env.GEMINI_MODEL}`);
        console.log('Sending request...');

        const start = Date.now();
        const response = await generateAIResponse('Hello! Are you working? Please respond with "YES".');
        const duration = Date.now() - start;

        console.log(`\nSuccessfully received response in ${duration}ms:`);
        console.log('---------------------------------------------------');
        console.log(response);
        console.log('---------------------------------------------------');
    } catch (error: any) {
        console.error('\nAI Service Test Failed:');
        console.error(error.message);
    }
}

testAI();
