import { generateStakeholderBrief } from '../services/ai.service';
// We can't mock actual internal function calls easily, but we mock the libraries they use.

// Mocks
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

jest.mock('../database/connection', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }), // Default empty config
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        subject: "Test Subject",
                        summary: "Test Summary",
                        key_actions: ["Action 1", "Action 2", "Action 3"],
                        tone: "Urgent"
                    })
                }
            })
        })
    }))
}));

jest.mock('openai');

describe('AI Service - Stakeholder Brief', () => {
    it('should generate a brief using AI', async () => {
        // Mock risk context
        const context = {
            top_risks: [{ risk_code: 'R1', statement: 'Test Risk', inherent_risk_score: 80 }],
            recent_incidents: [{ event_name: 'Inc1', severity: 'HIGH' }],
            compliance_status: 'Active Monitoring'
        };

        const result = await generateStakeholderBrief('BOARD', context);

        expect(result).toBeDefined();
        expect(result.subject).toBe("Test Subject");
        expect(result.summary).toBe("Test Summary");
        expect(result.tone).toBe("Urgent");
    });
});
