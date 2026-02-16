
import dotenv from 'dotenv';
import path from 'path';
import OpenAI from 'openai';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function testOpenRouter() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    console.log('Testing OpenRouter Connection...');
    console.log(`API Key prefix: ${apiKey?.substring(0, 10)}...`);
    console.log(`Model: ${model}`);

    if (!apiKey) {
        console.error('❌ Missing GEMINI_API_KEY');
        process.exit(1);
    }

    try {
        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Risk Assessment SaaS Test',
            }
        });

        const modelsToTry = [
            model,
            'mistralai/mistral-small-3.1-24b-instruct:free',
            'google/gemma-3-27b-it:free',
            'stepfun/step-3.5-flash:free',
            'qwen/qwen-2.5-coder-32b-instruct:free',
            'deepseek/deepseek-r1:free'
        ];

        for (const m of modelsToTry) {
            if (!m) continue;
            console.log(`\nTrying model: ${m}...`);
            try {
                const completion = await openai.chat.completions.create({
                    model: m,
                    messages: [{ role: 'user', content: 'Hi' }],
                });
                console.log(`✅ Success with ${m}:`);
                console.log(completion.choices[0]?.message?.content);
                return; // Stop after first success
            } catch (innerError: any) {
                console.error(`❌ Failed with ${m}:`, innerError.error?.message || innerError.message);
            }
        }

    } catch (error: any) {
        console.error('❌ Connection Failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testOpenRouter();
