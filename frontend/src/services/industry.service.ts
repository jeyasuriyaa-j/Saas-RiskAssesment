import api from './api';

export interface IndustryRisk {
    id: string;
    category: string;
    statement: string;
    description: string;
    typical_impact: number;
    typical_likelihood: number;
    source: string;
}

export interface IndustryBenchmark {
    id: string;
    industry: string;
    risk_category: string;
    avg_likelihood: number;
    avg_impact: number;
    risk_count: number;
}

export const industryService = {
    getRisks: async (category?: string) => {
        const response = await api.get<IndustryRisk[]>('/industry/risks', {
            params: { category }
        });
        return response.data;
    },

    getBenchmarks: async (industry?: string) => {
        const response = await api.get<IndustryBenchmark[]>('/industry/benchmarks', {
            params: { industry }
        });
        return response.data;
    },

    // Admin or specific trigger
    triggerAggregation: async () => {
        const response = await api.post('/industry/aggregate');
        return response.data;
    }
};
