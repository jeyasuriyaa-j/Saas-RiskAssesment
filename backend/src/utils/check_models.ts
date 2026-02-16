import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY!;
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('Fetching available models...');
    // Note: The specific method to list models might differ slightly depending on SDK version, 
    // but usually direct instantiation or a simple prompt to a known stable model is best. 
    // Since listModels isn't directly exposed on the simple client instance in older SDKs, 
    // we will try to just hit 'gemini-pro' which is the standard GA model.

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Hello');
        console.log('✅ gemini-pro is WORKING. Response:', result.response.text());
        console.log('✅ gemini-pro is WORKING.');
    } catch (e: any) {
        console.log('❌ gemini-pro failed:', e.message);
    }
}
listModels();
