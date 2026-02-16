require('dotenv').config({ path: './.env' });
const { connectDatabase } = require('./dist/database/connection');
const { generateAIResponse } = require('./dist/services/ai.service');

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
