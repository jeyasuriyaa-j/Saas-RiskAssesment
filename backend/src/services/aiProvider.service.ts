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
     * Properly separates the system context from the user/assistant conversation history.
     */
    askAI: async (messages: ChatMessage[]): Promise<string> => {
        try {
            // Extract system prompt (context) - this is always the first message
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationHistory = messages.filter(m => m.role !== 'system');

            // Build a well-structured prompt that the underlying AI expects
            let prompt = '';

            if (systemMessage) {
                prompt += systemMessage.content;
                prompt += '\n\n=== CONVERSATION ===\n';
            }

            // Add conversation history in a clear turn-by-turn format
            for (const msg of conversationHistory) {
                if (msg.role === 'user') {
                    prompt += `\nUser: ${msg.content}`;
                } else if (msg.role === 'assistant') {
                    prompt += `\nAssistant: ${msg.content}`;
                }
            }

            prompt += '\n\nAssistant:';

            logger.info('Calling AI Provider with structured chat prompt');
            const response = await generateAIResponse(prompt);
            // Strip any leading "Assistant:" prefix that AI might echo back
            return response.replace(/^Assistant:\s*/i, '').trim();
        } catch (error) {
            logger.error('AI provider error:', error);
            throw new Error('AI service is currently unavailable. Please try again later.');
        }
    }
};
