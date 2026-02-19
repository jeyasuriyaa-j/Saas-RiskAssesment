import { query } from '../database/connection';
import { logger } from '../utils/logger';

export interface LearningRecommendation {
    type: 'RISK_SCORE' | 'CONTROL_EFFECTIVENESS';
    id: string;
    item_name: string;
    current_value: number | string;
    suggested_value: number | string;
    reason: string;
    confidence: number;
}

export const getLearningRecommendations = async (tenantId: string): Promise<LearningRecommendation[]> => {
    try {
        const recommendations: LearningRecommendation[] = [];

        // 1. Analyze Risks with frequent incidents
        const riskAnalysis = await query(`
            SELECT 
                r.risk_id, 
                r.statement, 
                r.likelihood_score,
                COUNT(e.event_id) as incident_count
            FROM risks r
            JOIN ai_suggestions sug ON r.risk_id = sug.risk_id
            JOIN events e ON sug.event_id = e.event_id
            WHERE r.tenant_id = $1 AND e.reported_at > NOW() - INTERVAL '30 days'
            GROUP BY r.risk_id
            HAVING COUNT(e.event_id) >= 2
        `, [tenantId]);

        for (const row of riskAnalysis.rows) {
            if (row.incident_count >= 2 && row.likelihood_score < 4) {
                recommendations.push({
                    type: 'RISK_SCORE',
                    id: row.risk_id,
                    item_name: row.statement,
                    current_value: `Likelihood: ${row.likelihood_score}`,
                    suggested_value: `Likelihood: ${Math.min(5, row.likelihood_score + 1)}`,
                    reason: `Detected ${row.incident_count} incidents in last 30 days. Current frequency exceeds past assessment.`,
                    confidence: 0.85
                });
            }
        }

        // 2. Analyze Controls with failed effectiveness (based on incidents)
        const controlAnalysis = await query(`
            SELECT 
                c.control_id, 
                c.control_name, 
                c.effectiveness_percent as effectiveness_score,
                COUNT(e.event_id) as incident_count
            FROM controls c
            JOIN risk_control_mappings rc ON c.control_id = rc.control_id
            JOIN ai_suggestions sug ON rc.risk_id = sug.risk_id
            JOIN events e ON sug.event_id = e.event_id
            WHERE c.tenant_id = $1 AND e.reported_at > NOW() - INTERVAL '30 days'
            GROUP BY c.control_id
        `, [tenantId]);

        for (const row of controlAnalysis.rows) {
            if (row.incident_count >= 3 && row.effectiveness_score > 5) {
                recommendations.push({
                    type: 'CONTROL_EFFECTIVENESS',
                    id: row.control_id,
                    item_name: row.control_name,
                    current_value: row.effectiveness_score,
                    suggested_value: Math.max(0, row.effectiveness_score - 2),
                    reason: `Control bypassed/failed in ${row.incident_count} recent incidents. Reliability is lower than assessed.`,
                    confidence: 0.92
                });
            }
        }

        return recommendations;
    } catch (error) {
        logger.error('Error getting learning recommendations:', error);
        throw error;
    }
};
