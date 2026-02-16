export interface IndustryBenchmark {
    id: string;
    industry: string;
    risk_category: string;
    avg_likelihood: number;
    avg_impact: number;
    risk_count: number;
    last_updated_at?: Date;
}

import { query } from '../database/connection';

export class BenchmarkModel {
    static async getByIndustry(industry: string): Promise<IndustryBenchmark[]> {
        const result = await query('SELECT * FROM industry_benchmarks WHERE industry = $1', [industry]);
        return result.rows;
    }

    static async upsert(benchmark: Omit<IndustryBenchmark, 'id' | 'last_updated_at'>): Promise<IndustryBenchmark> {
        const { industry, risk_category, avg_likelihood, avg_impact, risk_count } = benchmark;
        const result = await query(
            `INSERT INTO industry_benchmarks 
            (industry, risk_category, avg_likelihood, avg_impact, risk_count, last_updated_at) 
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (industry, risk_category) 
            DO UPDATE SET 
                avg_likelihood = EXCLUDED.avg_likelihood,
                avg_impact = EXCLUDED.avg_impact,
                risk_count = EXCLUDED.risk_count,
                last_updated_at = NOW()
            RETURNING *`,
            [industry, risk_category, avg_likelihood, avg_impact, risk_count]
        );
        return result.rows[0];
    }
}
