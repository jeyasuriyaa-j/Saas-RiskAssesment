
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listOpenRouterModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in .env');
        return;
    }

    try {
        console.log('Fetching models from OpenRouter...');
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Risk Assessment SaaS',
            }
        });

        const models = response.data.data
            .filter((m: any) => m.id.includes('deepseek'))
            .sort((a: any, b: any) => a.id.localeCompare(b.id));

        console.log('DeepSeek Models Found:');
        models.forEach((m: any) => console.log(` - ${m.id}`));

        if (models.length === 0) {
            console.log('No DeepSeek models found. All models:');
            response.data.data.slice(0, 10).forEach((m: any) => console.log(` - ${m.id}`));
        }
    } catch (error: any) {
        console.error('Error fetching models:', error.response?.data || error.message);
    }
}

listOpenRouterModels();
