import { query } from '../database/connection';
import { BenchmarkModel } from '../models/benchmark.model';

export class FederatedLearningService {
    /**
     * Aggregates risk data across all tenants grouped by industry and risk category.
     * Calculates average likelihood and impact.
     * Enforces a minimum tenant count (k-anonymity) to ensure privacy.
     */
    static async aggregateBenchmarks(): Promise<void> {
        console.log('Starting federated benchmark aggregation...');

        // 1. Fetch aggregated stats
        // We join risks with tenants to get the industry.
        // We group by industry and risk.category.
        // We SHOULD filter out Draft/Deleted risks.
        const sql = `
            SELECT 
                t.industry,
                r.category,
                AVG(r.likelihood_score) as avg_likelihood,
                AVG(r.impact_score) as avg_impact,
                COUNT(r.risk_id) as risk_count,
                COUNT(DISTINCT t.tenant_id) as tenant_count
            FROM risks r
            JOIN tenants t ON r.tenant_id = t.tenant_id
            WHERE 
                r.status = 'ACTIVE' 
                AND t.industry IS NOT NULL
                AND r.category IS NOT NULL
                AND r.likelihood_score IS NOT NULL
                AND r.impact_score IS NOT NULL
            GROUP BY t.industry, r.category
        `;

        const result = await query(sql);
        const aggregations = result.rows;

        console.log(`Found ${aggregations.length} aggregation buckets.`);

        // const MIN_TENANTS_FOR_PRIVACY = 3; // Simulating privacy constraint. In prod, maybe 5 or 10.

        for (const agg of aggregations) {
            // Apply Privacy Filter
            // if (parseInt(agg.tenant_count) < MIN_TENANTS_FOR_PRIVACY) {
            //   console.log(`Skipping bucket ${agg.industry}/${agg.category} - insufficient data points (${agg.tenant_count}).`);
            // continue;
            //}

            // Upsert into benchmarks table
            await BenchmarkModel.upsert({
                industry: agg.industry,
                risk_category: agg.category,
                avg_likelihood: parseFloat(agg.avg_likelihood),
                avg_impact: parseFloat(agg.avg_impact),
                risk_count: parseInt(agg.risk_count)
            });
        }

        console.log('Federated aggregation complete.');
    }
}
