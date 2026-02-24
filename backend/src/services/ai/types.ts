export interface AIConfig {
    provider?: 'ollama' | 'cloud' | 'auto';
    model?: string;
    timeout?: number;
}

export interface RiskEntry {
    row_index: number;
    statement: string;
    description: string;
    category: string;
    likelihood: number;
    impact: number;
}

export interface AnalysisResult {
    row_index: number;
    original_data: RiskEntry;
    ai_analysis: {
        improved_statement: string;
        improved_description: string;
        suggested_category: string;
        score_analysis: {
            user_score_status: 'Aligned' | 'Underestimated' | 'Overestimated';
            suggested_likelihood: number;
            suggested_impact: number;
            reasoning: string;
            financial_impact_estimate?: string;
            strategic_remediation?: string;
            why_matters?: string;
        };
        confidence_score: number;
    };
}
