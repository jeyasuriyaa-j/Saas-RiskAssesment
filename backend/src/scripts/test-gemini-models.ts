import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key found in .env');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use the base fetch to check models if possible, or just try a different model name
        console.log('Testing connection with key starting with:', apiKey.substring(0, 5));

        // There isn't a direct listModels in the high-level SDK easily accessible without setup
        // But we can try the most likely fallback names
        const modelsToTry = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro'
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hi');
                console.log(`✅ Success with model: ${modelName} - Response: ${result.response.text().substring(0, 50)}`);
                return;
            } catch (e: any) {
                console.log(`❌ Failed with model: ${modelName} - ${e.message}`);
            }
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
