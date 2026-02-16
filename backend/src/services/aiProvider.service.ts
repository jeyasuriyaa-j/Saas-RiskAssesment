import { generateAIResponse } from './ai.service';
import { logger } from '../utils/logger';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * AI Provider Service
 * Clean interface for AI communication, wrapping the existing generateAIResponse.
 */
export const aiProvider = {
    /**
     * Ask the AI a question with history context.
     * For now, we concat history into a single prompt as generateAIResponse expects a string.
     */
    askAI: async (messages: ChatMessage[]): Promise<string> => {
        try {
            // Convert messages to a structured prompt format
            const formattedPrompt = messages.map(m => {
                const prefix = m.role === 'user' ? 'User: ' : m.role === 'assistant' ? 'AI: ' : 'System: ';
                return `${prefix}${m.content}`;
            }).join('\n\n');

            logger.info('Calling AI Provider with contextual prompt');
            return await generateAIResponse(formattedPrompt);
        } catch (error) {
            logger.error('AI provider error:', error);
            throw new Error('AI service is currently unavailable. Please try again later.');
        }
    }
};
