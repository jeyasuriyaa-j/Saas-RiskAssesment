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
    department?: string;
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
 * Process a batch of risks using a single AI call for the whole group (10x fewer API roundtrips)
 */
export async function processBatch(
  jobId: string,
  tenantId: string,
  batch: Array<{ row_index: number; row_hash: string; original_title: string; original_description: string; original_category: string; original_likelihood: number; original_impact: number }>
): Promise<AnalysisResult[]> {
  // --- 1. Resolve cache hits first ---
  const uncached: typeof batch = [];
  const cacheResults: AnalysisResult[] = [];

  await Promise.all(batch.map(async (risk) => {
    const cached = await getCachedAnalysis(tenantId, risk.row_hash);
    if (cached) {
      cacheResults.push({
        row_index: risk.row_index,
        original_data: { row_index: risk.row_index, statement: risk.original_title, description: risk.original_description, category: risk.original_category, likelihood: risk.original_likelihood, impact: risk.original_impact },
        ai_analysis: cached,
        analysis_status: 'done' as const
      });
    } else {
      uncached.push(risk);
    }
  }));

  // Bulk commit cache hits in one DB call
  if (cacheResults.length > 0) {
    await bulkUpdateRiskAnalysis(jobId, cacheResults.map(r => ({ row_index: r.row_index, status: 'done' as const, ai_result: r.ai_analysis })));
    logger.info(`Cache hits: ${cacheResults.length} rows skipped AI call in job ${jobId}`);
  }

  if (uncached.length === 0) return cacheResults;

  // --- 2. Single AI call for all uncached items ---
  let aiResultMap: Map<number, AnalysisResult['ai_analysis']>;
  try {
    aiResultMap = await analyzeRiskBatchWithAI(
      uncached.map(r => ({ row_index: r.row_index, statement: r.original_title, description: r.original_description, category: r.original_category, likelihood: r.original_likelihood, impact: r.original_impact }))
    );
  } catch (err: any) {
    logger.error(`Batch AI call failed for job ${jobId}:`, err);
    // Fallback: use original data for all
    aiResultMap = new Map(uncached.map(r => [r.row_index, {
      improved_statement: r.original_title, improved_description: r.original_description, suggested_category: r.original_category,
      score_analysis: { user_score_status: 'Aligned', suggested_likelihood: r.original_likelihood, suggested_impact: r.original_impact, reasoning: err.message },
      confidence_score: 0.5
    }]));
  }

  // --- 3. Bulk DB write for all AI results ---
  const aiResults: AnalysisResult[] = uncached.map(risk => {
    const aiAnalysis = aiResultMap.get(risk.row_index)!;
    return {
      row_index: risk.row_index,
      original_data: { row_index: risk.row_index, statement: risk.original_title, description: risk.original_description, category: risk.original_category, likelihood: risk.original_likelihood, impact: risk.original_impact },
      ai_analysis: aiAnalysis,
      analysis_status: 'done' as const
    };
  });

  await bulkUpdateRiskAnalysis(jobId, aiResults.map(r => ({ row_index: r.row_index, status: 'done' as const, ai_result: r.ai_analysis })));

  // Save each to cache (async, non-blocking)
  uncached.forEach(risk => {
    const result = aiResultMap.get(risk.row_index);
    if (result) saveToCache(tenantId, risk.row_hash, result).catch(() => { });
  });

  return [...cacheResults, ...aiResults];
}

/**
 * Bulk DB update for multiple risks in a single SQL call
 */
async function bulkUpdateRiskAnalysis(
  jobId: string,
  results: Array<{ row_index: number; status: 'done' | 'failed'; ai_result?: any; error_message?: string }>
): Promise<void> {
  if (results.length === 0) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const r of results) {
      await client.query(
        `UPDATE import_risk_analysis
         SET analysis_status = $1, ai_result = $2, error_message = $3,
             last_analysis_at = CURRENT_TIMESTAMP, analysis_attempts = analysis_attempts + 1
         WHERE job_id = $4 AND row_index = $5`,
        [r.status, r.ai_result ? JSON.stringify(r.ai_result) : null, r.error_message || null, jobId, r.row_index]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Analyze a BATCH of risks with a single AI call (10x fewer API calls)
 */
async function analyzeRiskBatchWithAI(
  entries: Array<{ row_index: number; statement: string; description: string; category: string; likelihood: number; impact: number }>
): Promise<Map<number, AnalysisResult['ai_analysis']>> {
  const { generateAIResponse, extractJSON } = await import('./ai.service');

  const inputJson = JSON.stringify(
    entries.map(e => ({ i: e.row_index, t: e.statement, d: (e.description || '').substring(0, 200), c: e.category, l: e.likelihood, im: e.impact }))
  );

  const prompt = `You are a Risk AI. Analyze each risk and return a JSON array - one object per item, same order.
Each object: {"i":rowIndex,"t":"improvedTitle","d":"improvedDesc (max 2 sentences)","l":1-5,"im":1-5,"c":"bestCategory","r":"1 sentence remediation"}
Return ONLY the JSON array. No markdown.

Risks:
${inputJson}`;

  const BATCH_TIMEOUT_MS = 45000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI batch timed out after 45s')), BATCH_TIMEOUT_MS)
  );

  const response = await Promise.race([generateAIResponse(prompt), timeoutPromise]);

  const resultMap = new Map<number, AnalysisResult['ai_analysis']>();

  try {
    const parsed: any[] = extractJSON(response);
    if (!Array.isArray(parsed)) throw new Error('AI did not return an array');

    for (const item of parsed) {
      const originalEntry = entries.find(e => e.row_index === item.i) || entries[0];
      resultMap.set(item.i, {
        improved_statement: item.t || originalEntry.statement,
        improved_description: item.d || originalEntry.description,
        suggested_category: item.c || originalEntry.category,
        department: item.c || originalEntry.category,
        score_analysis: {
          user_score_status: 'Aligned',
          suggested_likelihood: item.l || originalEntry.likelihood,
          suggested_impact: item.im || originalEntry.impact,
          reasoning: item.r || 'AI-powered risk assessment'
        },
        confidence_score: 0.85
      });
    }
  } catch (err) {
    logger.warn(`Batch AI parse failed, falling back to originals. Error: ${(err as any).message}`);
  }

  // Fallback for any missing rows
  for (const e of entries) {
    if (!resultMap.has(e.row_index)) {
      resultMap.set(e.row_index, {
        improved_statement: e.statement,
        improved_description: e.description,
        suggested_category: e.category,
        score_analysis: { user_score_status: 'Aligned', suggested_likelihood: e.likelihood, suggested_impact: e.impact, reasoning: 'AI parsing fallback' },
        confidence_score: 0.5
      });
    }
  }

  return resultMap;
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
  batchSize: 5,       // REDUCED: Smaller batches for faster UI feedback
  workerCount: 16,    // INCREASED: Higher concurrency for throughput
  maxRetries: 2,      // Max 2 retries per batch
  retryDelay: 1500    // 1.5s between retries (slightly faster)
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
  department?: string;
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

  const inputIds = new Set(inputs.map(r => r.id));

  const prompt = `Analyze ${inputs.length} risk(s). 
Output: JSON array of EXACTLY ${inputs.length} objects. 
Fields per object:
- "i": input id
- "t": professional title (MAX 6 words)
- "d": description (MAX 1 sentence)
- "dp": department
- "l": likelihood 1-5
- "im": impact 1-5
- "r": remediation (MAX 10 words)
- "fi": financial impact (range)

Input: ${JSON.stringify(compactInput)}

Return ONLY JSON array. No text before/after.`;

  try {
    const response = await generateAIResponse(prompt, { timeout: 60000 });
    const parsed = extractJSON<any[]>(response);

    if (!Array.isArray(parsed)) {
      // If single object returned, wrap it
      const single = parsed as any;
      return [mapParsedToOutput(single, inputs)];
    }

    // ANTI-HALLUCINATION FILTER: only keep results whose 'i' matches a real input ID.
    // This prevents the AI from injecting extra risks not present in the original data.
    const validParsed = parsed.filter((p: any) => inputIds.has(p.i));

    if (validParsed.length !== inputs.length) {
      logger.warn(`AI returned ${parsed.length} items for ${inputs.length} inputs. Filtered to ${validParsed.length} valid. Filling missing with fallback.`);
    }

    // Build a map from id -> parsed result for quick lookup
    const parsedById = new Map<number, any>();
    for (const p of validParsed) parsedById.set(p.i, p);

    // Return one result per input — use AI result if available, else fallback
    return inputs.map(inp => {
      const p = parsedById.get(inp.id);
      if (p) return mapParsedToOutput(p, inputs, inp);
      // Missing: build a fallback that preserves original data
      return {
        id: inp.id,
        improved_title: inp.title,
        improved_description: inp.description,
        impact_score: inp.impact,
        likelihood_score: inp.likelihood,
        risk_score: inp.impact * inp.likelihood,
        suggestions: inp.department,
        department: inp.department,
        why_matters: 'AI analysis unavailable — using original data.',
        financial_impact_estimate: 'N/A'
      };
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
    department: p.dp || p.department || input.department,
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

    // ── ROW DEDUPLICATION ────────────────────────────────────────────────────────
    // Group pending rows by content hash (title+description).
    // Only ONE representative per group is sent to AI; duplicates get their result
    // copied instantly — saving AI calls on repetitive datasets.
    const allPendingRows = await query(
      `SELECT analysis_id, row_index, row_hash
       FROM import_risk_analysis
       WHERE job_id = $1 AND analysis_status = 'pending'
       ORDER BY row_index ASC`,
      [jobId]
    );

    const hashGroups = new Map<string, number[]>();
    for (const row of allPendingRows.rows) {
      const h = row.row_hash as string;
      if (!hashGroups.has(h)) hashGroups.set(h, []);
      hashGroups.get(h)!.push(row.row_index as number);
    }

    // Track which rows are duplicates that should copy from their representative
    const dedupCopyMap = new Map<number, number>(); // copyRow -> representativeRow
    for (const [, indices] of hashGroups.entries()) {
      if (indices.length < 2) continue;
      const [representative, ...copies] = indices;
      for (const copyIdx of copies) {
        dedupCopyMap.set(copyIdx, representative);
      }
      logger.info(`⚡ Dedup: rows [${copies.join(',')}] are duplicates of row ${representative}`);
    }

    if (dedupCopyMap.size > 0) {
      // Mark duplicate rows as 'processing' so the main worker loop skips them
      await query(
        `UPDATE import_risk_analysis SET analysis_status = 'processing'
         WHERE job_id = $1 AND row_index = ANY($2)`,
        [jobId, [...dedupCopyMap.keys()]]
      );
      logger.info(`⚡ Dedup: Skipping ${dedupCopyMap.size} duplicate rows — results will be copied after analysis`);
    }
    // ── END DEDUPLICATION ────────────────────────────────────────────────────────

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

        // BULK UPDATE all rows in this batch in ONE query
        const updateParams = [];
        const updateValues: any[] = [];

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const result = resultMap.get(row.row_index);
          const status = result ? 'done' : 'failed';
          const aiResult = result || generateFallbackResults([{
            id: row.row_index,
            title: row.original_title,
            description: row.original_description,
            impact: row.original_impact,
            likelihood: row.original_likelihood,
            department: row.original_category || 'General'
          }])[0];
          const errorMsg = result ? null : (success ? 'AI response missing' : (lastError?.message || 'AI Batch Failed'));

          const base = i * 4;
          updateParams.push(`($${base + 1}::int, $${base + 2}::jsonb, $${base + 3}::text, $${base + 4}::text)`);
          updateValues.push(row.row_index, JSON.stringify(aiResult), status, errorMsg);
        }

        await query(
          `UPDATE import_risk_analysis AS ira
           SET ai_result = d.res::jsonb, 
               analysis_status = d.st::text, 
               error_message = d.err::text,
               last_analysis_at = CURRENT_TIMESTAMP
           FROM (VALUES ${updateParams.join(',')}) AS d(idx, res, st, err)
           WHERE ira.job_id = $${updateValues.length + 1} AND ira.row_index = d.idx`,
          [...updateValues, jobId]
        );

        batchCompleted += resultMap.size;
        batchFailed += (batch.length - resultMap.size);

        // UPDATE COUNTS LOCALLY (in-memory)
        completedCount += batchCompleted;
        failedCount += batchFailed;

        // INSTANT DEDUP PROPAGATION: Find all rows that depend on these results
        // Group copy indices by their representative result for bulk updates
        const resultToCopiesMap = new Map<string, number[]>();
        if (success) {
          for (const row of batch) {
            const resultStr = resultMap.has(row.row_index) ? JSON.stringify(resultMap.get(row.row_index)) : null;
            if (resultStr) {
              const copies = [];
              for (const [copyIdx, repIdx] of dedupCopyMap.entries()) {
                if (repIdx === row.row_index) copies.push(copyIdx);
              }
              if (copies.length > 0) resultToCopiesMap.set(resultStr, copies);
            }
          }
        }

        // Perform bulk updates for duplicates (one query per unique result string in this batch)
        let totalDuplicatesUpdated = 0;
        for (const [resultStr, copyIndices] of resultToCopiesMap.entries()) {
          try {
            await query(
              `UPDATE import_risk_analysis 
               SET ai_result = $1, analysis_status = 'done', error_message = NULL, last_analysis_at = CURRENT_TIMESTAMP
               WHERE job_id = $2 AND row_index = ANY($3::int[])`,
              [resultStr, jobId, copyIndices]
            );
            totalDuplicatesUpdated += copyIndices.length;
            completedCount += copyIndices.length;
          } catch (dedupErr) {
            logger.error(`Failed bulk dedup update for job ${jobId}:`, dedupErr);
          }
        }

        if (totalDuplicatesUpdated > 0) {
          logger.info(`⚡ Instant Dedup: Propagated results to ${totalDuplicatesUpdated} duplicates in bulk.`);
        }

        // DB UPDATE (Atomic Increment) & EMIT PROGRESS IMMEDIATELY
        await query(
          `UPDATE import_jobs 
           SET completed_batches = completed_batches + $1, failed_batches = failed_batches + $2 
           WHERE job_id = $3`,
          [batchCompleted + totalDuplicatesUpdated, batchFailed, jobId]
        );

        const currentProgress = totalRows > 0 ? Math.round(((completedCount + failedCount) / totalRows) * 100) : 0;
        batchAnalysisEvents.emit('progress', {
          jobId,
          progress: currentProgress,
          completedCount,
          failedCount,
          totalCount: totalRows,
          results: success ? results! : []
        });

        logger.info(`⚡ Batch Finish: ${completedCount + failedCount}/${totalRows} (${currentProgress}%) — Stream updated.`);

        return { completed: batchCompleted + totalDuplicatesUpdated, failed: batchFailed, results: success ? results! : [] };
      });

      // Wait for all workers to finish this round before pulling more rows
      await Promise.all(batchPromises);

      // If we got fewer rows than requested, we're near the end
      if (allRows.length < claimSize) {
        hasMore = false;
      }
    }

    // 3. Propagate dedup results — copy representative's AI result to all duplicate rows
    if (dedupCopyMap.size > 0) {
      logger.info(`⚡ Dedup copy: propagating results to ${dedupCopyMap.size} duplicate rows`);
      for (const [copyRowIndex, representativeRowIndex] of dedupCopyMap.entries()) {
        try {
          const repResult = await query(
            `SELECT ai_result FROM import_risk_analysis WHERE job_id = $1 AND row_index = $2 AND analysis_status = 'done'`,
            [jobId, representativeRowIndex]
          );
          if (repResult.rows.length > 0 && repResult.rows[0].ai_result) {
            await query(
              `UPDATE import_risk_analysis 
               SET ai_result = $1, analysis_status = 'done', error_message = NULL, last_analysis_at = CURRENT_TIMESTAMP
               WHERE job_id = $2 AND row_index = $3`,
              [repResult.rows[0].ai_result, jobId, copyRowIndex]
            );
            completedCount++;
          } else {
            // Representative wasn't analysed successfully — mark the copy as failed
            await query(
              `UPDATE import_risk_analysis SET analysis_status = 'failed', error_message = 'Dedup source failed'
               WHERE job_id = $1 AND row_index = $2`,
              [jobId, copyRowIndex]
            );
            failedCount++;
          }
        } catch (copyErr: any) {
          logger.error(`Dedup copy failed for row ${copyRowIndex}:`, copyErr);
        }
      }

      // Update final progress counts
      await query(
        `UPDATE import_jobs SET completed_batches = $1, failed_batches = $2 WHERE job_id = $3`,
        [completedCount, failedCount, jobId]
      );
    }

    // 4. Completion
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
