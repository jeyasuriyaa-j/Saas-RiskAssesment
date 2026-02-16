import { query } from '../database/connection';
import { logger } from '../utils/logger';

export interface DashboardMetrics {
    total_risks: number;
    closed_risks: number;
    risks_by_status: Record<string, number>;
    risks_by_priority: Record<string, number>;
    average_inherent_risk_score: string;
    average_residual_risk_score: string;
    risks_overdue_review: number;
    top_risk_categories: Array<{
        category: string;
        count: number;
        avg_score: string;
    }>;
    portfolio_concentration?: {
        concentration_score: number;
        high_risk_density: number;
        top_concentrated_category: string;
    };
}

export interface RiskHeatmapData {
    heatmap: Array<{
        likelihood: number;
        impact: number;
        count: number;
        risk_ids: string[];
    }>;
    scales: {
        likelihood: number;
        impact: number;
    };
}

export const getDashboardMetrics = async (tenantId: string, userId?: string, role?: string): Promise<DashboardMetrics> => {
    try {
        // Parallelize queries for performance
        // Fetch global configuration for scales
        const configResult = await query(
            'SELECT value FROM system_config WHERE key = $1',
            ['scoring']
        );

        const scoringConfig = configResult.rows[0]?.value || {};
        const scales = scoringConfig.scales || { likelihood: 5, impact: 5 };
        const maxScore = (scales.likelihood || 5) * (scales.impact || 5);

        // Fetch tenant-specific Risk Appetite
        const tenantResult = await query(
            'SELECT risk_appetite_config FROM tenants WHERE tenant_id = $1',
            [tenantId]
        );
        const appetiteConfig = tenantResult.rows[0]?.risk_appetite_config || {};
        const thresholds = appetiteConfig.thresholds || { critical: 80, high: 60, medium: 40, low: 20 };

        // Thresholds based on APPETITE CONFIG (stored as absolute scores or percentages of max score?)
        // In our UI we showed them as percentages/absolute values. 
        // Let's assume they are absolute scores for now or handle both.
        // Actually, in the UI I used them as values that can go up to 100? No, let's keep them as scores.
        const criticalThreshold = thresholds.critical || Math.ceil(maxScore * 0.8);
        const highThreshold = thresholds.high || Math.ceil(maxScore * 0.5);
        const medThreshold = thresholds.medium || Math.ceil(maxScore * 0.2);

        // Enterprise Isolation Logic
        let baseWhere = 'tenant_id = $1';
        let queryParams: any[] = [tenantId];
        let nextIdx = 2;

        if (role === 'user' && userId) {
            baseWhere = `(tenant_id = $1 OR $${nextIdx++} = ANY(current_assignee_ids))`;
            queryParams.push(userId);
        }

        // Redefine metrics to use dynamic thresholds
        const priorityQuery = `
            SELECT priority, COUNT(*) as count
            FROM (
                SELECT 
                    CASE 
                        WHEN (likelihood_score * impact_score) >= $${nextIdx} THEN 'critical'
                        WHEN (likelihood_score * impact_score) >= $${nextIdx + 1} THEN 'high'
                        WHEN (likelihood_score * impact_score) >= $${nextIdx + 2} THEN 'medium'
                        ELSE 'low'
                    END as priority
                FROM risks 
                WHERE ${baseWhere} AND status != 'CLOSED'
            ) as sub
            GROUP BY priority`;

        const [
            totalRisksResult,
            closedRisksResult,
            statusResult,
            priorityResult,
            scoresResult,
            overdueResult,
            categoriesResult
        ] = await Promise.all([
            // 1. Total Risks (exclude CLOSED)
            query(`SELECT COUNT(*) as count FROM risks WHERE ${baseWhere} AND status != 'CLOSED'`, queryParams),

            // 2. Closed Risks
            query(`SELECT COUNT(*) as count FROM risks WHERE ${baseWhere} AND status = 'CLOSED'`, queryParams),

            // 3. Risks by Status (exclude CLOSED)
            query(`SELECT status, COUNT(*) as count FROM risks WHERE ${baseWhere} AND status != 'CLOSED' GROUP BY status`, queryParams),

            // 3. Risks by Priority (Dynamic)
            query(priorityQuery, [...queryParams, criticalThreshold, highThreshold, medThreshold]),

            // 4. Average Scores
            query(`
                SELECT 
                    AVG(likelihood_score * impact_score) as avg_inherent,
                    AVG(residual_risk_percent) as avg_residual 
                FROM risks 
                WHERE ${baseWhere} AND status != 'CLOSED'`,
                queryParams
            ),

            // 5. Overdue Reviews
            query(`SELECT COUNT(*) as count FROM risks WHERE ${baseWhere} AND status != 'CLOSED' AND next_review_due_at < NOW()`, queryParams),

            // 6. Top Categories
            query(`
                SELECT category, COUNT(*) as count, AVG(likelihood_score * impact_score) as avg_score
                FROM risks 
                WHERE ${baseWhere} AND status != 'CLOSED' 
                GROUP BY category 
                ORDER BY count DESC 
                LIMIT 5`,
                queryParams
            )
        ]);

        // Format Risks by Status
        const risks_by_status: Record<string, number> = {};
        statusResult.rows.forEach((row: any) => {
            risks_by_status[row.status.toLowerCase()] = parseInt(row.count);
        });

        // Format Risks by Priority
        const risks_by_priority: Record<string, number> = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        priorityResult.rows.forEach((row: any) => {
            if (row.priority) {
                risks_by_priority[row.priority] = parseInt(row.count);
            }
        });

        const totalRisks = parseInt(totalRisksResult.rows[0].count);

        return {
            total_risks: totalRisks,
            closed_risks: parseInt(closedRisksResult.rows[0].count),
            risks_by_status,
            risks_by_priority,
            average_inherent_risk_score: parseFloat(scoresResult.rows[0].avg_inherent || '0').toFixed(1),
            average_residual_risk_score: parseFloat(scoresResult.rows[0].avg_residual || '0').toFixed(1),
            risks_overdue_review: parseInt(overdueResult.rows[0].count),
            top_risk_categories: categoriesResult.rows.map((row: any) => ({
                category: row.category || 'Uncategorized',
                count: parseInt(row.count),
                avg_score: parseFloat(row.avg_score || '0').toFixed(1)
            })),
            portfolio_concentration: {
                concentration_score: totalRisks > 0 ? Math.round((categoriesResult.rows[0]?.count / totalRisks) * 100) : 0,
                high_risk_density: totalRisks > 0 ? Math.round(((risks_by_priority.critical + risks_by_priority.high) / totalRisks) * 100) : 0,
                top_concentrated_category: categoriesResult.rows[0]?.category || 'None'
            },
            scales: {
                likelihood: scales.likelihood || 5,
                impact: scales.impact || 5,
                max_score: maxScore
            }
        } as any;

    } catch (error) {
        logger.error('Error fetching dashboard metrics:', error);
        throw error;
    }
};

export const getRiskHeatmap = async (tenantId: string, userId?: string, role?: string): Promise<RiskHeatmapData> => {
    try {
        // Build WHERE clause based on role
        // For users: can see risks in their tenant OR risks they're assigned to
        // For others: strict tenant filtering
        let whereClause = 'tenant_id = $1';
        let params: any[] = [tenantId];

        if (role === 'user' && userId) {
            whereClause = `(tenant_id = $1 OR $2 = ANY(current_assignee_ids))`;
            params.push(userId);
        }

        // Aggregate risks by L x I coordinates
        const result = await query(`
            SELECT 
                likelihood_score as likelihood, 
                impact_score as impact, 
                COUNT(*) as count,
                array_agg(risk_id) as risk_ids
            FROM risks 
            WHERE ${whereClause} AND status != 'CLOSED' 
            GROUP BY likelihood_score, impact_score`,
            params
        );

        // Fetch global configuration for scales
        const configResult = await query(
            'SELECT value FROM system_config WHERE key = $1',
            ['scoring']
        );

        const scoringConfig = configResult.rows[0]?.value || {};
        const scales = scoringConfig.scales || { likelihood: 5, impact: 5 };

        return {
            heatmap: result.rows.map((row: any) => ({
                likelihood: row.likelihood,
                impact: row.impact,
                count: parseInt(row.count),
                risk_ids: row.risk_ids
            })),
            scales: {
                likelihood: scales.likelihood || 5,
                impact: scales.impact || 5
            }
        };

    } catch (error) {
        logger.error('Error fetching risk heatmap:', error);
        throw error;
    }
};

export const getBoardSummary = async (tenantId: string, userId?: string, role?: string) => {
    try {
        const metrics = await getDashboardMetrics(tenantId, userId, role);

        // Enterprise Isolation Logic
        let whereClause = 'tenant_id = $1';
        let params: any[] = [tenantId];

        if (role === 'user' && userId) {
            whereClause = `(tenant_id = $1 OR $2 = ANY(current_assignee_ids))`;
            params.push(userId);
        }

        // Get Top 5 Risks specifically
        const topRisksResult = await query(`
            SELECT statement, (likelihood_score * impact_score) as score, category, status
            FROM risks 
            WHERE ${whereClause} AND status != 'CLOSED'
            ORDER BY score DESC
            LIMIT 5`,
            params
        );

        // Get Compliance Overview
        const complianceResult = await query(`
            SELECT 
                COUNT(*) as total_frameworks,
                COALESCE(SUM(CASE WHEN enabled = true THEN 1 ELSE 0 END), 0) as enabled_frameworks
            FROM compliance_frameworks
            WHERE tenant_id = $1 OR tenant_id IS NULL`,
            [tenantId]
        );

        // AI Summary Logic (Template-based for now, feeling AI-ish)
        const riskLevel = parseFloat(metrics.average_inherent_risk_score) > 15 ? 'Elevated' : 'Stable';
        const aiSummary = `The overall risk posture is currently ${riskLevel}. ${metrics.risks_by_priority.critical > 0 ? `Attention is required for ${metrics.risks_by_priority.critical} critical risks.` : 'No critical outliers detected this period.'} Portfolio concentration in ${metrics.portfolio_concentration?.top_concentrated_category} is ${metrics.portfolio_concentration?.concentration_score}%, suggesting a need for diversification in mitigation strategies. Compliance coverage is maturing across ${complianceResult.rows[0].enabled_frameworks} active frameworks.`;

        return {
            overall_status: riskLevel,
            executive_summary: aiSummary,
            metrics,
            top_risks: topRisksResult.rows,
            compliance_overview: {
                total: parseInt(complianceResult.rows[0].total_frameworks),
                active: parseInt(complianceResult.rows[0].enabled_frameworks)
            },
            generated_at: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error fetching board summary:', error);
        throw error;
    }
};
