export interface IndustryRisk {
    id: string;
    category: string;
    statement: string;
    description?: string;
    typical_impact?: number;
    typical_likelihood?: number;
    source?: string;
    created_at?: Date;
}

import { query } from '../database/connection';

export class IndustryRiskModel {
    static async getAll(): Promise<IndustryRisk[]> {
        const result = await query('SELECT * FROM industry_risks ORDER BY category, statement');
        return result.rows;
    }

    static async getByCategory(category: string): Promise<IndustryRisk[]> {
        const result = await query('SELECT * FROM industry_risks WHERE category = $1', [category]);
        return result.rows;
    }

    static async create(risk: Omit<IndustryRisk, 'id' | 'created_at'>): Promise<IndustryRisk> {
        const { category, statement, description, typical_impact, typical_likelihood, source } = risk;
        const result = await query(
            `INSERT INTO industry_risks 
            (category, statement, description, typical_impact, typical_likelihood, source) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
            [category, statement, description, typical_impact, typical_likelihood, source]
        );
        return result.rows[0];
    }
}
