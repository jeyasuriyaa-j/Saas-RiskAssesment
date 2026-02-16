/**
 * Batch Analysis Service
 * Handles parallel, batched AI analysis of imported risks with caching
 */

import { query, getClient } from '../database/connection';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// Event emitter for streaming results
export const batchAnalysisEvents = new EventEmitter();
batchAnalysisEvents.setMaxListeners(100);

// Types
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
      user_score_status: string;
      suggested_likelihood: number;
      suggested_impact: number;
      reasoning: string;
    };
    confidence_score: number;
  };
  analysis_status: 'pending' | 'processing' | 'done' | 'failed';
  error_message?: string;
}

export interface BatchJob {
  jobId: string;
  tenantId: string;
  totalRows: number;
  batchSize: number;
  concurrency: number;
}

/**
 * Generate hash for risk caching
 */
export function generateRiskHash(title: string, description: string): string {
  const content = `${title?.toLowerCase().trim() || ''}|${description?.toLowerCase().trim() || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Save risks to database with pending status
 */
export async function saveRisksForAnalysis(
  jobId: string,
  tenantId: string,
  entries: RiskEntry[]
): Promise<void> {
  try {
    // Insert all risks with pending status
    for (const entry of entries) {
      const rowHash = generateRiskHash(entry.statement, entry.description);

      await query(
        `INSERT INTO import_risk_analysis (
          job_id, tenant_id, row_index, row_hash,
          original_title, original_description, original_category,
          original_likelihood, original_impact,
          analysis_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        ON CONFLICT (job_id, row_index) DO NOTHING`,
        [
          jobId, tenantId, entry.row_index, rowHash,
          entry.statement, entry.description, entry.category,
          entry.likelihood, entry.impact
        ]
      );
    }

    // Update job with batch info
    // total_batches should be the number of rows to analyze
    await query(
      `UPDATE import_jobs 
       SET total_batches = $1, completed_batches = 0, failed_batches = 0
       WHERE job_id = $2`,
      [entries.length, jobId]
    );

    logger.info(`Saved ${entries.length} risks for analysis in job ${jobId}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Check cache for existing analysis
 */
export async function getCachedAnalysis(
  tenantId: string,
  rowHash: string
): Promise<any | null> {
  const result = await query(
    `SELECT ai_result FROM ai_analysis_cache 
     WHERE tenant_id = $1 AND row_hash = $2`,
    [tenantId, rowHash]
  );

  if (result.rows.length > 0) {
    // Update hit count
    await query(
      `UPDATE ai_analysis_cache 
       SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND row_hash = $2`,
      [tenantId, rowHash]
    );
    return result.rows[0].ai_result;
  }

  return null;
}

/**
 * Save analysis result to cache
 */
export async function saveToCache(
  tenantId: string,
  rowHash: string,
  aiResult: any
): Promise<void> {
  await query(
    `INSERT INTO ai_analysis_cache (tenant_id, row_hash, ai_result)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, row_hash) DO NOTHING`,
    [tenantId, rowHash, JSON.stringify(aiResult)]
  );
}

/**
 * Update risk analysis status and result
 */
export async function updateRiskAnalysis(
  jobId: string,
  rowIndex: number,
  status: 'pending' | 'processing' | 'done' | 'failed',
  aiResult?: any,
  errorMessage?: string
): Promise<void> {
  await query(
    `UPDATE import_risk_analysis 
     SET analysis_status = $1,
         ai_result = $2,
         error_message = $3,
         last_analysis_at = CURRENT_TIMESTAMP,
         analysis_attempts = analysis_attempts + 1
     WHERE job_id = $4 AND row_index = $5`,
    [status, aiResult ? JSON.stringify(aiResult) : null, errorMessage || null, jobId, rowIndex]
  );
}

/**
 * Claim pending risks for processing using SKIP LOCKED to prevent redundancy
 */
export async function claimPendingRisks(
  jobId: string,
  limit: number
): Promise<Array<{ row_index: number; row_hash: string; original_title: string; original_description: string; original_category: string; original_likelihood: number; original_impact: number }>> {
  const result = await query(
    `UPDATE import_risk_analysis
     SET analysis_status = 'processing'
     WHERE analysis_id IN (
       SELECT analysis_id FROM import_risk_analysis
       WHERE job_id = $1 AND analysis_status = 'pending'
       ORDER BY row_index ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     RETURNING row_index, row_hash, original_title, original_description, 
               original_category, original_likelihood, original_impact`,
    [jobId, limit]
  );

  return result.rows;
}

export async function getPendingRisks(
  jobId: string,
  limit: number = 5
): Promise<Array<{ row_index: number; row_hash: string; original_title: string; original_description: string; original_category: string; original_likelihood: number; original_impact: number }>> {
  const result = await query(
    `SELECT row_index, row_hash, original_title, original_description, 
            original_category, original_likelihood, original_impact
     FROM import_risk_analysis
     WHERE job_id = $1 AND analysis_status = 'pending'
     ORDER BY row_index
     LIMIT $2`,
    [jobId, limit]
  );

  return result.rows;
}

/**
 * Process a single batch of risks
 */
export async function processBatch(
  jobId: string,
  tenantId: string,
  batch: Array<{ row_index: number; row_hash: string; original_title: string; original_description: string; original_category: string; original_likelihood: number; original_impact: number }>
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  // Process each risk in the batch concurrently
  const promises = batch.map(async (risk) => {
    try {
      // Status is already 'processing' from claimPendingRisks, but we ensure it here if called differently
      // await updateRiskAnalysis(jobId, risk.row_index, 'processing');

      // Check cache first
      const cached = await getCachedAnalysis(tenantId, risk.row_hash);
      if (cached) {
        logger.info(`Cache hit for row ${risk.row_index} in job ${jobId}`);
        await updateRiskAnalysis(jobId, risk.row_index, 'done', cached);
        return {
          row_index: risk.row_index,
          original_data: {
            row_index: risk.row_index,
            statement: risk.original_title,
            description: risk.original_description,
            category: risk.original_category,
            likelihood: risk.original_likelihood,
            impact: risk.original_impact
          },
          ai_analysis: cached,
          analysis_status: 'done' as const
        };
      }

      // Call AI for analysis
      const aiResult = await analyzeRiskWithAI({
        row_index: risk.row_index,
        statement: risk.original_title,
        description: risk.original_description,
        category: risk.original_category,
        likelihood: risk.original_likelihood,
        impact: risk.original_impact
      }, tenantId);

      // Save to cache and update status
      await saveToCache(tenantId, risk.row_hash, aiResult);
      await updateRiskAnalysis(jobId, risk.row_index, 'done', aiResult);

      return {
        row_index: risk.row_index,
        original_data: {
          row_index: risk.row_index,
          statement: risk.original_title,
          description: risk.original_description,
          category: risk.original_category,
          likelihood: risk.original_likelihood,
          impact: risk.original_impact
        },
        ai_analysis: aiResult,
        analysis_status: 'done' as const
      };
    } catch (error: any) {
      logger.error(`AI analysis failed for row ${risk.row_index} in job ${jobId}:`, error);
      await updateRiskAnalysis(jobId, risk.row_index, 'failed', undefined, error.message);
      return {
        row_index: risk.row_index,
        original_data: {
          row_index: risk.row_index,
          statement: risk.original_title,
          description: risk.original_description,
          category: risk.original_category,
          likelihood: risk.original_likelihood,
          impact: risk.original_impact
        },
        ai_analysis: {
          improved_statement: risk.original_title,
          improved_description: risk.original_description,
          suggested_category: risk.original_category,
          score_analysis: {
            user_score_status: 'Aligned',
            suggested_likelihood: risk.original_likelihood,
            suggested_impact: risk.original_impact,
            reasoning: error.message
          },
          confidence_score: 0.5
        },
        analysis_status: 'failed' as const,
        error_message: error.message
      };
    }
  });

  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  return results;
}

/**
 * Analyze a single risk with AI
 */
async function analyzeRiskWithAI(
  entry: RiskEntry,
  _tenantId: string
): Promise<AnalysisResult['ai_analysis']> {
  // Import AI service dynamically to avoid circular dependencies
  const { generateAIResponse } = await import('./ai.service');

  const prompt = `You are a Risk Management AI assistant.
Return strict JSON only.
No explanations or markdown.
Be concise.

Analyze the following risk and return:

{
  "improvedTitle": "Short, professional title",
  "improvedDescription": "Precise description (MAX 2 sentences)",
  "likelihood": number,
  "impact": number,
  "riskScore": number,
  "remediation": "Concise 1-sentence action",
  "recommendedControls": ["Control 1", "Control 2"],
  "department": "Department name"
}

Risk:
- Title: ${entry.statement}
- Description: ${entry.description || 'N/A'}
- Category: ${entry.category}
- Current Likelihood: ${entry.likelihood}/5
- Current Impact: ${entry.impact}/5

Send only the JSON response.`;

  const response = await generateAIResponse(prompt);

  // Parse JSON response using the robust extractor
  try {
    // Dynamically import extractJSON to avoid circular dependency if needed, 
    // but better to rely on the one from ai.service if possible.
    // Since we already import generateAIResponse, let's assume we can get extractJSON too.
    const { extractJSON } = await import('./ai.service');

    // We already called generateAIResponse, now use extractJSON
    const parsed = extractJSON(response);

    return {
      improved_statement: parsed.improvedTitle || parsed.improved_statement || entry.statement,
      improved_description: parsed.improvedDescription || parsed.improved_description || entry.description,
      suggested_category: parsed.department || parsed.suggested_category || entry.category,
      score_analysis: {
        user_score_status: 'Aligned', // Default
        suggested_likelihood: parsed.likelihood || entry.likelihood,
        suggested_impact: parsed.impact || entry.impact,
        reasoning: parsed.remediation || parsed.reasoning || 'AI-powered risk assessment'
      },
      confidence_score: 0.85
    };
  } catch (error) {
    logger.error(`Failed to parse AI response for row ${entry.row_index}:`, error);
    // Return fallback
    return {
      improved_statement: entry.statement,
      improved_description: entry.description,
      suggested_category: entry.category,
      score_analysis: {
        user_score_status: 'Aligned',
        suggested_likelihood: entry.likelihood,
        suggested_impact: entry.impact,
        reasoning: 'AI analysis failed, using original data'
      },
      confidence_score: 0.5
    };
  }
}

/**
 * Main batch processing function with concurrency control
 * Optimally refactored for speed and real-time feedback
 */
export async function processBatchesWithConcurrency(
  jobId: string,
  tenantId: string,
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<void> {
  const batchSize = options.batchSize || 5;
  const concurrency = options.concurrency || 5;

  logger.info(`Starting refined batch processing for job ${jobId}. BatchSize: ${batchSize}, Concurrency: ${concurrency}`);

  // Get total rows for progress calculation once
  const jobInfo = await query('SELECT total_batches FROM import_jobs WHERE job_id = $1', [jobId]);
  const totalRows = jobInfo.rows[0]?.total_batches || 1;
  let completedRows = 0;
  let failedRows = 0;

  let hasMoreWork = true;

  while (hasMoreWork) {
    // 1. Claim a chunk of work for all concurrent workers
    const workItems = await claimPendingRisks(jobId, batchSize * concurrency);

    if (workItems.length === 0) {
      hasMoreWork = false;
      break;
    }

    // 2. Partition workItems into batches for workers
    const workerBatches = [];
    for (let i = 0; i < workItems.length; i += batchSize) {
      workerBatches.push(workItems.slice(i, i + batchSize));
    }

    // 3. Process batches concurrently
    const batchPromises = workerBatches.map(async (batch) => {
      const results = await processBatch(jobId, tenantId, batch);

      // Update counts
      const successes = results.filter(r => r.analysis_status === 'done').length;
      const failures = results.filter(r => r.analysis_status === 'failed').length;
      logger.info(`Batch processed: ${results.length} items. Success: ${successes}, Failed: ${failures}`);

      if (results.length > 0) {
        logger.info(`First result sample: ${JSON.stringify(results[0].ai_analysis)}`);
      }

      completedRows += successes;
      failedRows += failures;

      // Update job progress in DB (Throttle this if needed, but for small-mid imports it's fine)
      await query(
        `UPDATE import_jobs 
         SET completed_batches = $1, failed_batches = $2 
         WHERE job_id = $3`,
        [completedRows, failedRows, jobId]
      );

      // Emit progress event for streaming (Immediately show results in UI)
      const progress = Math.round((completedRows / totalRows) * 100);
      batchAnalysisEvents.emit('progress', {
        jobId,
        results,
        progress,
        completedCount: completedRows,
        totalCount: totalRows
      });
    });

    await Promise.all(batchPromises);

    // Safety break if we're not making progress
    if (workItems.length < batchSize * concurrency) {
      hasMoreWork = false;
    }
  }

  // Mark job as analyzed
  await query(
    `UPDATE import_jobs SET status = 'analyzed' WHERE job_id = $1`,
    [jobId]
  );

  batchAnalysisEvents.emit('complete', { jobId });
  logger.info(`Batch processing completed for job ${jobId}. Completed: ${completedRows}, Failed: ${failedRows}`);
}

/**
 * Get all analysis results for a job
 */
export async function getAnalysisResults(
  jobId: string
): Promise<AnalysisResult[]> {
  const result = await query(
    `SELECT row_index, original_title, original_description, original_category,
            original_likelihood, original_impact, analysis_status, ai_result, error_message
     FROM import_risk_analysis
     WHERE job_id = $1
     ORDER BY row_index`,
    [jobId]
  );

  return result.rows.map((row: any) => ({
    row_index: row.row_index,
    original_data: {
      row_index: row.row_index,
      statement: row.original_title,
      description: row.original_description,
      category: row.original_category,
      likelihood: row.original_likelihood,
      impact: row.original_impact
    },
    ai_analysis: row.ai_result ? {
      improved_statement: row.ai_result.improved_title || row.original_title,
      improved_description: row.ai_result.improved_description || row.original_description,
      suggested_category: row.ai_result.suggestions || row.original_category,
      risk_score: row.ai_result.risk_score || (row.original_impact * row.original_likelihood),
      confidence_score: 0.85,
      score_analysis: {
        user_score_status: 'Aligned',
        suggested_likelihood: row.ai_result.likelihood_score || row.original_likelihood,
        suggested_impact: row.ai_result.impact_score || row.original_impact,
        reasoning: 'Batch AI Analysis result',
        why_matters: row.ai_result.why_matters || 'AI-assessed risk requiring attention.',
        financial_impact_estimate: row.ai_result.financial_impact_estimate || 'Requires further financial assessment.'
      }
    } : {
      improved_statement: row.original_title,
      improved_description: row.original_description,
      suggested_category: row.original_category,
      score_analysis: {
        user_score_status: 'Aligned',
        suggested_likelihood: row.original_likelihood,
        suggested_impact: row.original_impact,
        reasoning: 'Initial evaluation',
        why_matters: 'Analysis pending.',
        financial_impact_estimate: 'Analysis pending.'
      },
      confidence_score: 0.5
    },
    analysis_status: row.analysis_status,
    error_message: row.error_message
  }));
}

/**
 * Retry failed analyses
 */
export async function retryFailedAnalyses(jobId: string, _tenantId?: string): Promise<void> {
  await query(
    `UPDATE import_risk_analysis
     SET analysis_status = 'pending', error_message = NULL
     WHERE job_id = $1 AND analysis_status = 'failed'`,
    [jobId]
  );

  logger.info(`Retrying failed analyses for job ${jobId}`);
}

// ============================================
// HIGH-SPEED PARALLEL BATCH PROCESSING
// 25 risks/batch × 4 workers = 1000 risks in ~20-40s
// ============================================

export interface BatchConfig {
  batchSize: number;
  workerCount: number;
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 25,      // 25 risks per AI call
  workerCount: 4,     // 4 concurrent workers
  maxRetries: 1,      // Max 1 retry per batch
  retryDelay: 1000    // 1s between retries
};

export interface RiskInput {
  id: number;
  title: string;
  description: string;
  impact: number;
  likelihood: number;
  department: string;
}

export interface RiskAnalysisOutput {
  id: number;
  improved_title: string;
  improved_description: string;
  impact_score: number;
  likelihood_score: number;
  risk_score: number;
  suggestions: string;
  why_matters?: string;
  financial_impact_estimate?: string;
}

function generateBatchRiskHash(title: string, description: string): string {
  const content = `${title?.toString().toLowerCase().trim() || ''}|${description?.toString().toLowerCase().trim() || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * High-performance batch insert with transaction
 */
export async function bulkInsertRisksHighPerf(
  jobId: string,
  tenantId: string,
  inputs: RiskInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  logger.info(`Bulk inserting ${inputs.length} risks for job ${jobId}`);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Build batch VALUES for faster insert
    const CHUNK = 100;
    for (let c = 0; c < inputs.length; c += CHUNK) {
      const chunk = inputs.slice(c, c + CHUNK);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIdx = 1;

      for (const input of chunk) {
        const rowHash = generateBatchRiskHash(input.title, input.description);
        placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, 'pending', 0, NULL)`);
        values.push(jobId, tenantId, input.id, rowHash, input.title, input.description, input.department, input.likelihood, input.impact);
        paramIdx += 9;
      }

      await client.query(
        `INSERT INTO import_risk_analysis (
          job_id, tenant_id, row_index, row_hash,
          original_title, original_description, original_category,
          original_likelihood, original_impact,
          analysis_status, analysis_attempts, error_message
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (job_id, row_index) DO UPDATE SET
          original_title = EXCLUDED.original_title,
          analysis_status = 'pending'`,
        values
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await query(
    `UPDATE import_jobs SET total_batches = $1 WHERE job_id = $2`,
    [inputs.length, jobId]
  );

  logger.info(`Bulk insert complete: ${inputs.length} risks ready.`);
}

/**
 * Analyze a batch of up to 25 risks in a single AI call.
 * Uses ultra-compact JSON prompt for speed.
 * Calculates risk_score locally (impact × likelihood).
 */
async function analyzeBatchWithAI(
  inputs: RiskInput[]
): Promise<RiskAnalysisOutput[]> {
  if (inputs.length === 0) return [];

  const { generateAIResponse, extractJSON } = await import('./ai.service');

  // Build compact input array with single-letter keys
  const compactInput = inputs.map(r => ({
    i: r.id,
    t: (r.title || '').substring(0, 200),
    d: (r.description || '').substring(0, 200),
    l: r.likelihood,
    im: r.impact
  }));

  const prompt = `You are a risk management expert. Analyze these ${inputs.length} risks. Return a JSON array ONLY — no markdown, no extra text.

Input risks:
${JSON.stringify(compactInput)}

For EACH risk, return an object with these keys:
- "i": the id from the input
- "t": a professional, brief risk title (MAX 10 words)
- "d": a concise, improved description (MAX 2 sentences, focused on root cause and impact)
- "dp": the most appropriate department
- "l": likelihood score 1-5
- "im": impact score 1-5  
- "r": a sharp, 1-sentence remediation recommendation
- "fi": estimated financial impact range (e.g. "$10K-$50K")

Return ONLY the JSON array.`;

  try {
    const response = await generateAIResponse(prompt, { timeout: 20000 });
    const parsed = extractJSON<any[]>(response);

    if (!Array.isArray(parsed)) {
      // If single object returned, wrap it
      const single = parsed as any;
      return [mapParsedToOutput(single, inputs)];
    }

    // Map parsed results back to full output, calculating risk_score locally
    return parsed.map((p: any) => {
      // Find matching input by id
      const matchInput = inputs.find(inp => inp.id === p.i) || inputs[0];
      return mapParsedToOutput(p, inputs, matchInput);
    });

  } catch (error: any) {
    logger.error(`Batch AI analysis failed for ${inputs.length} risks: ${error.message}`);
    throw error;
  }
}

/** Map a parsed AI response item to RiskAnalysisOutput */
function mapParsedToOutput(p: any, inputs: RiskInput[], matchInput?: RiskInput): RiskAnalysisOutput {
  const input = matchInput || inputs.find(inp => inp.id === p.i) || inputs[0];
  const impactScore = Number(p.im) || Number(p.impact) || input.impact;
  const likelihoodScore = Number(p.l) || Number(p.likelihood) || input.likelihood;

  return {
    id: p.i ?? input.id,
    improved_title: p.t || p.improved_title || input.title,
    improved_description: p.d || p.improved_description || input.description,
    impact_score: impactScore,
    likelihood_score: likelihoodScore,
    risk_score: impactScore * likelihoodScore, // LOCAL calculation
    suggestions: p.dp || p.department || input.department,
    why_matters: p.r || p.remediation || 'AI-assessed risk.',
    financial_impact_estimate: p.fi || 'N/A'
  };
}

/**
 * Generate fallback results when AI fails for a batch.
 * Uses original data with local risk_score calculation.
 */
function generateFallbackResults(inputs: RiskInput[]): RiskAnalysisOutput[] {
  return inputs.map(input => ({
    id: input.id,
    improved_title: input.title,
    improved_description: input.description,
    impact_score: input.impact,
    likelihood_score: input.likelihood,
    risk_score: input.impact * input.likelihood,
    suggestions: input.department,
    why_matters: 'AI analysis unavailable — using original data.',
    financial_impact_estimate: 'N/A'
  }));
}

/**
 * HIGH-SPEED PARALLEL BATCH PROCESSOR
 * 
 * Flow: claim batch → parallel analyze → bulk save → emit progress → repeat
 * 
 * 1000 risks ÷ 25/batch = 40 AI calls
 * 4 workers × ~2-4s/call = ~20-40s total
 */
export async function processBatchesHighPerf(
  jobId: string,
  _tenantId: string,
  totalRows: number,
  config?: Partial<BatchConfig>
): Promise<void> {
  const cfg = { ...DEFAULT_BATCH_CONFIG, ...config };
  const startTime = Date.now();

  logger.info(`⚡ Starting HIGH-SPEED batch processing: jobId=${jobId}, total=${totalRows}, batchSize=${cfg.batchSize}, workers=${cfg.workerCount}`);

  let completedCount = 0;
  let failedCount = 0;

  try {
    // 1. Resume capability — check existing progress
    // Refresh totalRows from DB (use total_batches which represents actual risk count)
    const jobInfo = await query('SELECT total_batches FROM import_jobs WHERE job_id = $1', [jobId]);
    if (jobInfo.rows.length > 0 && jobInfo.rows[0].total_batches > 0) {
      totalRows = jobInfo.rows[0].total_batches;
      logger.info(`Updated totalRows to ${totalRows} from DB total_batches`);
    }

    const existingResult = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE analysis_status = 'done') as done,
         COUNT(*) FILTER (WHERE analysis_status = 'failed') as failed
       FROM import_risk_analysis WHERE job_id = $1`,
      [jobId]
    );
    completedCount = parseInt(existingResult.rows[0].done) || 0;
    failedCount = parseInt(existingResult.rows[0].failed) || 0;

    if (completedCount + failedCount > 0) {
      logger.info(`Resuming job ${jobId}: ${completedCount} done, ${failedCount} failed`);
    }

    // Reset any stale 'processing' rows back to 'pending' (from crashed runs)
    await query(
      `UPDATE import_risk_analysis SET analysis_status = 'pending' WHERE job_id = $1 AND analysis_status = 'processing'`,
      [jobId]
    );

    // 2. Parallel worker loop
    let hasMore = true;
    while (hasMore) {
      // Claim a chunk for all workers at once
      const claimSize = cfg.batchSize * cfg.workerCount;
      const claimResult = await query(
        `UPDATE import_risk_analysis
         SET analysis_status = 'processing'
         WHERE analysis_id IN (
           SELECT analysis_id FROM import_risk_analysis
           WHERE job_id = $1 AND analysis_status = 'pending'
           ORDER BY row_index ASC
           LIMIT $2
           FOR UPDATE SKIP LOCKED
         )
         RETURNING analysis_id, row_index, original_title, original_description, original_likelihood, original_impact, original_category`,
        [jobId, claimSize]
      );

      if (claimResult.rows.length === 0) {
        hasMore = false;
        break;
      }

      // Split claimed rows into worker batches
      type ClaimedRow = { analysis_id: number; row_index: number; original_title: string; original_description: string; original_likelihood: number; original_impact: number; original_category: string };
      const allRows: ClaimedRow[] = claimResult.rows;
      const workerBatches: ClaimedRow[][] = [];
      for (let i = 0; i < allRows.length; i += cfg.batchSize) {
        workerBatches.push(allRows.slice(i, i + cfg.batchSize));
      }

      // Process all batches in parallel (up to workerCount concurrent)
      const batchPromises = workerBatches.map(async (batch) => {
        const inputs: RiskInput[] = batch.map((row: ClaimedRow) => ({
          id: row.row_index,
          title: row.original_title || '',
          description: row.original_description || '',
          impact: row.original_impact || 3,
          likelihood: row.original_likelihood || 3,
          department: row.original_category || 'General'
        }));

        let results: RiskAnalysisOutput[];
        let success = false;
        let lastError: any = null;

        // Retry logic per batch
        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
          try {
            results = await analyzeBatchWithAI(inputs);
            success = true;
            break;
          } catch (err: any) {
            lastError = err;
            if (attempt < cfg.maxRetries) {
              logger.warn(`Batch attempt ${attempt + 1} failed, retrying in ${cfg.retryDelay}ms...`);
              await new Promise(r => setTimeout(r, cfg.retryDelay));
            } else {
              logger.error(`Batch failed after ${cfg.maxRetries + 1} attempts: ${err.message}`);
            }
          }
        }

        // Build a map of results by row_index for fast lookup
        const resultMap = new Map<number, RiskAnalysisOutput>();
        if (success && results!) {
          for (const r of results!) {
            resultMap.set(r.id, r);
          }
        }

        // Bulk update each row in the batch
        let batchCompleted = 0;
        let batchFailed = 0;

        for (const row of batch) {
          const result = resultMap.get(row.row_index);
          if (result) {
            await query(
              `UPDATE import_risk_analysis 
               SET ai_result = $1, analysis_status = 'done', error_message = NULL, last_analysis_at = CURRENT_TIMESTAMP
               WHERE job_id = $2 AND row_index = $3`,
              [JSON.stringify(result), jobId, row.row_index]
            );
            batchCompleted++;
          } else {
            // Use fallback for this specific row
            const fallback = generateFallbackResults([{
              id: row.row_index,
              title: row.original_title,
              description: row.original_description,
              impact: row.original_impact,
              likelihood: row.original_likelihood,
              department: row.original_category || 'General'
            }])[0];

            const errorMsg = success
              ? 'AI response missing for this row (Partial Result)'
              : (lastError?.message || 'AI Batch Analysis Failed');

            await query(
              `UPDATE import_risk_analysis 
               SET ai_result = $1, analysis_status = 'done', error_message = $2, last_analysis_at = CURRENT_TIMESTAMP
               WHERE job_id = $3 AND row_index = $4`,
              [JSON.stringify(fallback), errorMsg, jobId, row.row_index]
            );
            if (success) batchCompleted++; else batchFailed++;
          }
        }

        return { completed: batchCompleted, failed: batchFailed, results: success ? results! : [] };
      });

      // Wait for all workers to finish this round
      const roundResults = await Promise.all(batchPromises);

      // Aggregate counts
      let roundResults_all: RiskAnalysisOutput[] = [];
      for (const r of roundResults) {
        completedCount += r.completed;
        failedCount += r.failed;
        roundResults_all.push(...r.results);
      }

      // Update job progress in DB
      await query(
        `UPDATE import_jobs SET completed_batches = $1, failed_batches = $2 WHERE job_id = $3`,
        [completedCount, failedCount, jobId]
      );

      // Emit progress for real-time frontend updates
      const progress = totalRows > 0 ? Math.round(((completedCount + failedCount) / totalRows) * 100) : 0;
      batchAnalysisEvents.emit('progress', {
        jobId,
        progress,
        completedCount,
        failedCount,
        totalCount: totalRows,
        results: roundResults_all
      });

      logger.info(`⚡ Progress: ${completedCount + failedCount}/${totalRows} (${progress}%) — ${completedCount} done, ${failedCount} failed`);

      // If we got fewer rows than requested, we're near the end
      if (allRows.length < claimSize) {
        hasMore = false;
      }
    }

    // 3. Completion
    const durationMs = Date.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(1);

    const finalStatus = (completedCount + failedCount) >= totalRows ? 'analyzed' : 'partially_analyzed';
    await query(
      `UPDATE import_jobs SET status = $1, completed_at = NOW() WHERE job_id = $2`,
      [finalStatus, jobId]
    );

    logger.info(`⚡ COMPLETED job ${jobId}: ${completedCount} done, ${failedCount} failed, ${durationSec}s total`);
    batchAnalysisEvents.emit('complete', { jobId, status: finalStatus, durationMs });

  } catch (error: any) {
    logger.error(`Critical error in processBatchesHighPerf for job ${jobId}:`, error);
    await query(
      `UPDATE import_jobs SET status = 'failed', error_log = $1 WHERE job_id = $2`,
      [JSON.stringify({ message: error.message, stack: error.stack }), jobId]
    );
    throw error;
  }
}
