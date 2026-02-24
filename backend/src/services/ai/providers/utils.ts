import { logger } from '../../../utils/logger';

export async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000,
    factor: number = 2
): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries <= 0) throw error;

        const isAuthError = error.message?.includes('401') || error.message?.includes('Invalid API Key');
        if (isAuthError) throw error;

        const isRateLimit = error.message?.includes('429') || error.status === 429;
        let currentDelay = delay;

        if (isRateLimit) {
            currentDelay = Math.min(Math.max(2000, delay), 10000);
            logger.warn(`AI Rate Limit hit. Waiting ${currentDelay}ms before retry...`);
        }

        logger.warn(`AI Request failed. Retrying in ${currentDelay}ms... (${retries} attempts left). Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));

        const backoffFactor = isRateLimit ? 1.5 : factor;
        return withRetry(fn, retries - 1, currentDelay * backoffFactor, factor);
    }
}

export function extractJSON<T = any>(text: string): T {
    try {
        if (!text) throw new Error('Empty AI response');

        let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/```[a-zA-Z]*\n?/g, '')
            .replace(/```/g, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch (e) {
            const jsonRegex = /({[\s\S]*?}|\[[\s\S]*?\])/;
            const match = cleaned.match(jsonRegex);

            if (match) {
                try {
                    return JSON.parse(match[0]);
                } catch (innerError: any) {
                    const startChar = cleaned.includes('{') ? '{' : '[';
                    const endChar = startChar === '{' ? '}' : ']';
                    const start = cleaned.indexOf(startChar);
                    const end = cleaned.lastIndexOf(endChar);
                    if (start !== -1 && end !== -1) {
                        return JSON.parse(cleaned.substring(start, end + 1));
                    }
                    throw innerError;
                }
            }

            throw new Error('No JSON object or array found in response');
        }
    } catch (error: any) {
        logger.error('AI JSON extraction failed:', {
            preview: text.substring(0, 500),
            error: error.message
        });
        throw new Error('Failed to parse AI response as valid JSON');
    }
}
