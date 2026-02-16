import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyGeminiConnection() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY is missing via process.env');
        process.exit(1);
    }
    console.log(`🔑 Found API Key: ${apiKey.substring(0, 5)}...`);

    try {
        console.log('📡 Attempting to connect to Gemini API...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = 'Respond with exactly: "API_OK"';
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text.includes('API_OK')) {
            console.log('✅ Success: Gemini API is responding correctly.');
        } else {
            console.warn('⚠️ Warning: API responded but content was unexpected:', text);
        }

    } catch (error: any) {
        console.error('❌ API Verification Failed:', error.message);
        if (error.status === 429) {
            console.error('⛔ Rate Limit Exceeded. You are temporarily blocked.');
        }
    }
}

verifyGeminiConnection();
