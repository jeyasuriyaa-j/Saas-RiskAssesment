
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('No API Key found');
            return;
        }

        console.log('Fetching available models from API directly...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json() as any;

        if (data.models) {
            console.log('Available models:');
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (Supported)`);
                } else {
                    console.log(`- ${m.name} (Not for generateContent)`);
                }
            });
        } else {
            console.log('Failed to list models:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
