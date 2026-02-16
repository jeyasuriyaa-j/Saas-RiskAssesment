import dotenv from 'dotenv';
dotenv.config();
import { generateAIResponse } from './src/services/ai.service';

async function testAI() {
    console.log('Testing AI Availability...');
    try {
        const response = await generateAIResponse('Reply with "AI is Online" if you receive this.');
        console.log('AI Response:', response);
    } catch (error: any) {
        console.error('AI Check Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
    }
}

testAI();
