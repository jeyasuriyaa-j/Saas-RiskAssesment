
import dotenv from 'dotenv';
import path from 'path';
import { generateAIResponse } from './services/ai.service';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyOllama() {
    console.log('--- OLLAMA VERIFICATION START ---');
    console.log('Configured API Key:', process.env.GEMINI_API_KEY);
    console.log('Configured Ollama Model:', process.env.OLLAMA_MODEL);

    const verificationPrompt = `Identity Verification: Tell me exactly which AI model you are and confirm if you are "KIMI k2.5 cloud" running via Ollama. Provide a brief explanation of your capabilities.`;

    try {
        console.log('Sending prompt to Ollama...');
        const startTime = Date.now();
        const response = await generateAIResponse(verificationPrompt);
        const duration = (Date.now() - startTime) / 1000;

        console.log('\n--- AI RESPONSE ---');
        console.log(response);
        console.log('-------------------');
        console.log(`Response received in ${duration.toFixed(2)}s`);

        if (response.toLowerCase().includes('kimi') || response.toLowerCase().includes('k2.5')) {
            console.log('\n✅ CONFIRMED: Response received from KIMI k2.5 cloud via Ollama.');
        } else {
            console.log('\n⚠️ WARNING: Response does not explicitly mention KIMI. Please check the output manually.');
        }
    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);
    }
}

verifyOllama();
