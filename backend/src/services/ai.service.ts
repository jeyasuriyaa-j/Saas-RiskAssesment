import { logger } from '../utils/logger';
import { query } from '../database/connection';
import { AIConfig } from './ai/types';
import { withRetry, extractJSON } from './ai/providers/utils';
import { generateGeminiResponse } from './ai/providers/gemini.provider';
import { generateOpenAIResponse } from './ai/providers/openai.provider';
import { generateMoonshotResponse } from './ai/providers/moonshot.provider';
import { generateGroqResponse } from './ai/providers/groq.provider';

export { AIConfig, extractJSON };

/**
 * Orchestrator for AI response generation.
 * Handles provider selection and routing to specialized modules.
 */
export async function generateAIResponse(prompt: string, config: AIConfig = {}): Promise<string> {
  const retryCount = (config as any).isBatch || (config as any).isImport ? 3 : 4;

  return withRetry(async () => {
    const globalConfig = await getGlobalAIConfig();

    const geminiApiKey = globalConfig.api_key || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const defaultModel = globalConfig.model || process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // === MOONSHOT / NVIDIA NIM DETECTION ===
    const moonshotApiKey = process.env.MOONSHOT_API_KEY || (geminiApiKey && (geminiApiKey.startsWith('sk-EQ') || geminiApiKey.startsWith('nvapi-')) ? geminiApiKey : undefined);

    if (moonshotApiKey) {
      const modelName = config.model || defaultModel || (moonshotApiKey.startsWith('nvapi-') ? 'moonshotai/kimi-k2-thinking' : 'google/gemini-2.5-flash-lite');
      return generateMoonshotResponse(prompt, moonshotApiKey, modelName, config);
    }

    // === GROQ DETECTION ===
    if (groqApiKey && groqApiKey.startsWith('gsk_')) {
      const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      return generateGroqResponse(prompt, groqApiKey, groqModel, config);
    }

    // === OPENAI / OPENROUTER / ZHIPUAI DETECTION ===
    const apiKey = (geminiApiKey || '').trim();
    if (!apiKey) throw new Error('AI API Key is missing (GEMINI_API_KEY or Database config)');

    const isGenericOpenAI =
      apiKey.startsWith('sk-or-') ||
      apiKey.startsWith('sk-') ||
      apiKey.startsWith('rcai-') ||
      apiKey.includes('.') ||
      (config.model || defaultModel || '').includes('/');

    if (isGenericOpenAI) {
      const orModel = config.model || defaultModel;
      return generateOpenAIResponse(prompt, apiKey, orModel, config);
    }

    // === DEFAULT: GOOGLE GEMINI ===
    const modelName = config.model || defaultModel;
    return generateGeminiResponse(prompt, apiKey, modelName, config);
  }, retryCount, 3000);
}

/**
 * Utility to fetch global AI configuration from DB
 */
async function getGlobalAIConfig() {
  try {
    const result = await query('SELECT value FROM system_config WHERE key = $1', ['ai_config']);
    return result.rows[0]?.value || {};
  } catch (error) {
    logger.warn('Failed to fetch global AI config, falling back to env vars');
    return {};
  }
}

/**
 * Helper to fetch tenant configuration
 */
async function getTenantConfig(tenantId: string) {
  const result = await query('SELECT settings FROM tenants WHERE tenant_id = $1', [tenantId]);
  return result.rows[0]?.settings || {};
}

/**
 * Calculate risk score based on rules (No AI cost)
 */
export function calculateRuleBasedRiskScore(originalData: any): any {
  if (originalData.likelihood && originalData.impact) {
    return {
      user_score_status: 'Aligned',
      suggested_likelihood: originalData.likelihood,
      suggested_impact: originalData.impact,
      reasoning: 'Calculated from provided Likelihood and Impact',
      confidence_score: 1.0
    };
  }
  return null;
}

// === ANALYSIS & IMPORT SERVICE FUNCTIONS ===

export async function analyzeSingleRisk(rowIndex: number, originalData: any, tenantId: string): Promise<any> {
  try {
    const ruleBasedScore = calculateRuleBasedRiskScore(originalData);
    const tenantConfig = await getTenantConfig(tenantId);
    const scale = tenantConfig.scales || { likelihood: 5, impact: 5 };

    const prompt = `System Role: You are a senior Chief Risk Officer (CRO) providing high-stakes advice to the board.
    Analyze the following risk and provide a critical, specific, and actionable assessment.
    
    Original Risk Data:
    - Statement: ${originalData.statement || 'Not provided'}
    - Description: ${originalData.description || 'Not provided'}
    - Category: ${originalData.category || 'Not specified'}
    - User Score: Likelihood=${originalData.likelihood || 'N/A'}, Impact=${originalData.impact || 'N/A'}
    - Scoring Scale: 1-${scale.likelihood} for Likelihood, 1-${scale.impact} for Impact
    ${ruleBasedScore ? `\nNOTE: The user scores seem valid. focus on the qualitative analysis.` : ''}
    
    Tasks:
    1. **Critique & Improve**: Rewrite the risk statement to be specific (Cause -> Event -> Impact).
    2. **Financial Impact Analysis**: Estimate the potential financial loss range (in USD).
    3. **Strategic Remediation**: What exact steps should be taken *immediately*?
    4. **Why This Matters**: A sharp, executive-level summary.
    
    Return JSON:
    {
      "improved_statement": "...",
      "improved_description": "...",
      "suggested_category": "...",
      "score_analysis": {
        "user_score_status": "Aligned|Underestimated|Overestimated",
        "suggested_likelihood": 1-5,
        "suggested_impact": 1-5,
        "reasoning": "...",
        "financial_impact_estimate": "...",
        "strategic_remediation": "...",
        "why_matters": "..."
      },
      "confidence_score": 0.95
    }`;

    const text = await generateAIResponse(prompt);
    const analysis = extractJSON(text);

    const finalScoreAnalysis = {
      user_score_status: analysis.score_analysis?.user_score_status || 'Aligned',
      suggested_likelihood: analysis.score_analysis?.suggested_likelihood || originalData.likelihood,
      suggested_impact: analysis.score_analysis?.suggested_impact || originalData.impact,
      reasoning: analysis.score_analysis?.reasoning || 'No specific reasoning provided',
      financial_impact_estimate: analysis.score_analysis?.financial_impact_estimate || 'Not estimated',
      strategic_remediation: analysis.score_analysis?.strategic_remediation || 'Review and monitor',
      why_matters: analysis.score_analysis?.why_matters || 'Standard risk item'
    };

    if (ruleBasedScore && finalScoreAnalysis.user_score_status === 'Aligned') {
      finalScoreAnalysis.reasoning = ruleBasedScore.reasoning + ". " + finalScoreAnalysis.reasoning;
    }

    return {
      row_index: rowIndex,
      original_data: originalData,
      ai_analysis: {
        improved_statement: analysis.improved_statement || originalData.statement,
        improved_description: analysis.improved_description || originalData.description,
        suggested_category: analysis.suggested_category || originalData.category,
        score_analysis: finalScoreAnalysis,
        confidence_score: analysis.confidence_score || 0.8
      }
    };
  } catch (error) {
    logger.error(`AI analysis error for row ${rowIndex}:`, error);
    return {
      row_index: rowIndex,
      original_data: originalData,
      ai_analysis: {
        improved_statement: originalData.statement,
        improved_description: originalData.description,
        suggested_category: originalData.category,
        score_analysis: {
          user_score_status: 'Aligned',
          suggested_likelihood: originalData.likelihood || 3,
          suggested_impact: originalData.impact || 3,
          reasoning: 'AI analysis unavailable, keeping original values'
        },
        confidence_score: 0.5
      }
    };
  }
}

export async function analyzeRiskEntriesBatch(entries: any[], tenantId: string, options: { concurrency?: number } = {}): Promise<any[]> {
  const concurrency = options.concurrency || 5;
  const results = [];
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(entry => analyzeSingleRisk(entry.row_index, entry, tenantId)));
    results.push(...batchResults);
    logger.info(`Batch AI analysis progress: ${Math.min(i + concurrency, entries.length)}/${entries.length}`);
  }
  return results;
}

export async function validateDataQuality(rawRows: any[][], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const sampleRows = rawRows.slice(0, 50);
    const headers = sampleRows[0] || [];

    const prompt = `System Role: You are a data quality gatekeeper. Analyze the following dataset for quality.
    Headers: ${JSON.stringify(headers)}
    Sample Data: ${JSON.stringify(sampleRows.slice(1))}
    Tenant Rules: ${JSON.stringify(tenantConfig.terminology || {})}
    
    Return JSON:
    {
      "data_quality_score": 0-100,
      "assessment_summary": "...",
      "blocking_issues": [],
      "warnings": [],
      "field_completeness": {},
      "safe_to_proceed": true,
      "remediation_steps": [],
      "confidence_score": 90
    }`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI data validation error:', error);
    return { data_quality_score: 100, safe_to_proceed: true, assessment_summary: "AI validation unavailable." };
  }
}

export async function analyzeExcelSheetStructure(rawData: any[][], tenantId: string, sheetName: string = 'Sheet1'): Promise<any> {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const sampleData = rawData.slice(0, 15);
    const prompt = `Analyze raw Excel data and identify sheet structure for "${sheetName}".
    Tenant Context: ${JSON.stringify(tenantConfig.terminology || {})}
    Raw Data: ${JSON.stringify(sampleData)}
    
    Return JSON:
    {
      "purpose": "Risk Register",
      "sheet_summary": "...",
      "header_row_index": 0,
      "data_start_row": 1,
      "relevance_score": 0-100,
      "detected_columns": []
    }`;
    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    return { purpose: "Risk Register (Fallback)", header_row_index: 0, data_start_row: 1, relevance_score: 100 };
  }
}

export async function analyzeExcelColumns(detectedColumns: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const prompt = `Map Excel headers to database schema.
    Tenant Terminology: ${JSON.stringify(tenantConfig.terminology || {})}
    Columns: ${JSON.stringify(detectedColumns)}
    
    Return JSON:
    {
      "mapped_fields": [{ "excel_column": "A", "mapped_to_field": "risk_statement", "confidence": 95 }],
      "confidence_score": 90
    }`;
    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    return { mapped_fields: [], confidence_score: 0 };
  }
}

export async function suggestRiskScore(riskStatement: string, riskDescription: string, tenantId: string, _useIndustryBenchmarks: boolean = false) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const scale = tenantConfig.scales || { likelihood: 5, impact: 5 };
    const prompt = `Suggest likelihood (1-${scale.likelihood}) and impact (1-${scale.impact}) scores.
    Risk: ${riskStatement} - ${riskDescription}
    
    Return JSON:
    {
      "suggested_likelihood": 3,
      "suggested_impact": 3,
      "rationale": "...",
      "confidence_score": 85
    }`;
    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    throw new Error('Failed to generate risk score suggestions');
  }
}

export async function improveRiskDescription(rawRisk: string, tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const prompt = `Rewrite risk into audit-ready format.
    Input: "${rawRisk}"
    Language Preference: ${tenantConfig.language_preference || 'Professional'}
    
    Return JSON:
    {
      "improved_risk": "...",
      "cause": "...",
      "event": "...",
      "impact": "...",
      "confidence_score": 95
    }`;
    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    throw new Error('Failed to improve risk description');
  }
}

// === BACKGROUND PROCESSES ===

export async function processRiskImprovement(requestId: string, _riskId: string, rawStatement: string, tenantId: string) {
  try {
    const suggestion = await improveRiskDescription(rawStatement, tenantId);
    await query('UPDATE ai_suggestions SET status = \'COMPLETED\', suggestion = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2', [JSON.stringify(suggestion), requestId]);
  } catch (error) {
    await query('UPDATE ai_suggestions SET status = \'FAILED\', updated_at = CURRENT_TIMESTAMP WHERE request_id = $1', [requestId]);
  }
}

export async function processRiskScoring(requestId: string, _riskId: string, riskStatement: string, riskDescription: string, tenantId: string, _useIndustryBenchmarks: boolean) {
  try {
    const suggestion = await suggestRiskScore(riskStatement, riskDescription, tenantId, _useIndustryBenchmarks);
    await query('UPDATE ai_suggestions SET status = \'COMPLETED\', suggestion = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2', [JSON.stringify(suggestion), requestId]);
  } catch (error) {
    await query('UPDATE ai_suggestions SET status = \'FAILED\', updated_at = CURRENT_TIMESTAMP WHERE request_id = $1', [requestId]);
  }
}

// === COMPLIANCE & GOVERNANCE FUNCTIONS ===

export async function recommendControls(riskStatement: string, riskDescription: string, _category?: string) {
  const prompt = `Recommend controls for: ${riskStatement} (${riskDescription})
  Return JSON: { "recommended_controls": [{ "control_name": "...", "control_type": "...", "effectiveness": 4, "rationale": "..." }] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function analyzeDocument(fileContent: string, fileName: string, fileType: string) {
  const prompt = `System Role: You are a senior Chief Risk Officer (CRO) and Strategic Auditor.
  Analyze the following document to extract high-value risk intelligence.
  
  Document Metadata:
  - Name: ${fileName}
  - Type: ${fileType}
  
  Content Analysis (First 8000 chars):
  ${fileContent.substring(0, 8000)}
  
  Tasks:
  1. Identify the core purpose of this document.
  2. Provide a concise, board-level summary.
  3. Extract at least 5 key findings related to enterprise risk or operational gaps.
  4. Suggest specific, actionable mitigation or strategic steps.
  5. Score the relevance to enterprise risk (0-100) and your confidence in this analysis (0-100).
  6. Extract relevant metadata (e.g., date ranges, categories, total items).

  Return JSON ONLY:
  {
    "document_type": "...",
    "purpose": "...",
    "summary": "...",
    "key_findings": ["...", "..."],
    "suggested_actions": ["...", "..."],
    "risk_relevance_score": 0-100,
    "confidence_score": 0-100,
    "metadata": {
      "total_items": 0,
      "categories_found": ["...", "..."],
      "date_range": "..."
    }
  }`;

  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function detectScaleDrift(risks: any[], tenantId: string) {
  const tenantConfig = await getTenantConfig(tenantId);
  const prompt = `Detect scoring inconsistencies. Model: ${JSON.stringify(tenantConfig.scales)}
  Risks: ${JSON.stringify(risks.slice(0, 50))}
  Return JSON: { "detected_outliers": [], "drift_trends": [] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function detectStaleRisks(risks: any[]) {
  const prompt = `Identify stale risks from this list: ${JSON.stringify(risks.slice(0, 50))}
  Return JSON: { "zombie_risks": [], "decay_reason": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function mapControlsAndRegulations(riskStatement: string, context?: string) {
  const prompt = `Map controls and regulations for: ${riskStatement}. Context: ${context}
  Return JSON: { "mapped_controls": [], "mapped_regulations": [], "rationale": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function explainComplianceImpact(riskStatement: string) {
  const prompt = `Explain compliance impact if "${riskStatement}" is not mitigated.
  Return JSON: { "impact_summary": "...", "affected_frameworks": [] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function generateExecutiveSummary(risks: any[]) {
  const prompt = `Generate executive risk summary. High risks: ${JSON.stringify(risks.filter(r => (r.likelihood_score * r.impact_score) > 10).slice(0, 20))}
  Return JSON: { "executive_summary": "...", "key_changes": [], "decisions_required": [] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function estimateFinancialImpact(riskStatement: string, context?: string) {
  const prompt = `Estimate financial impact range for: ${riskStatement}. Context: ${context}
  Return JSON: { "financial_impact_range": "$XK-$YK", "assumptions": [] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function detectRiskDuplicates(risks: any[], _tenantId: string) {
  // const _tenantConfig = await getTenantConfig(_tenantId);
  const prompt = `Detect duplicate risks. Risks: ${JSON.stringify(risks.slice(0, 100))}
  Return JSON: { "duplicate_clusters": [], "consolidation_summary": {} }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function evaluateControlEffectiveness(risk: any, controls: any[]) {
  const prompt = `Evaluate control effectiveness. Risk: ${risk.title}, Controls: ${JSON.stringify(controls)}
  Return JSON: { "control_effectiveness": [], "coverage_summary": {}, "residual_risk_assessment": {} }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function processControlEffectiveness(requestId: string, riskId: string, tenantId: string) {
  try {
    const riskResult = await query('SELECT risk_id, statement as title, description, inherent_risk_score FROM risks WHERE risk_id = $1 AND tenant_id = $2', [riskId, tenantId]);
    if (riskResult.rows.length === 0) throw new Error('Risk not found');
    const controls = (await query('SELECT c.* FROM controls c JOIN risk_control_mappings rcm ON c.control_id = rcm.control_id WHERE rcm.risk_id = $1', [riskId])).rows;
    const evaluation = await evaluateControlEffectiveness(riskResult.rows[0], controls);
    await query('UPDATE ai_suggestions SET status = \'COMPLETED\', suggestion = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2', [JSON.stringify(evaluation), requestId]);
  } catch (error) {
    await query('UPDATE ai_suggestions SET status = \'FAILED\', updated_at = CURRENT_TIMESTAMP WHERE request_id = $1', [requestId]);
  }
}

export async function assessEventImpact(_eventType: string, _eventDetails: any, _risks: any[], _tenantId: string) {
  const prompt = `Assess impact of event "${_eventType}" on risks. Details: ${JSON.stringify(_eventDetails)}
  Risks: ${JSON.stringify(_risks.slice(0, 50))}
  Return JSON: { "affected_risks": [], "recommended_action": "...", "summary": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function processEventImpactAssessment(requestId: string, _eventId: string, eventType: string, eventDetails: any, tenantId: string) {
  try {
    const risks = (await query('SELECT risk_id, risk_code, statement FROM risks WHERE tenant_id = $1 AND status != \'CLOSED\'', [tenantId])).rows;
    const assessment = await assessEventImpact(eventType, eventDetails, risks, tenantId);
    await query('UPDATE ai_suggestions SET status = \'COMPLETED\', suggestion = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2', [JSON.stringify(assessment), requestId]);
  } catch (error) {
    await query('UPDATE ai_suggestions SET status = \'FAILED\', updated_at = CURRENT_TIMESTAMP WHERE request_id = $1', [requestId]);
  }
}

export async function generateMergeStrategies(duplicateClusters: any[], existingRisks: any[], incomingRisks: any[]): Promise<any[]> {
  const strategies = [];
  for (const cluster of duplicateClusters) {
    const existing = existingRisks.find(r => cluster.risk_ids?.includes(r.risk_id));
    const incoming = incomingRisks.find(r => cluster.risk_ids?.includes(r.risk_id));
    if (!existing || !incoming) continue;
    const prompt = `Recommend merge strategy for duplicate risks. Existing: ${existing.statement}, Incoming: ${incoming.statement}
    Return JSON: { "recommended_strategy": "...", "reason": "...", "confidence": 0.85 }`;
    const text = await generateAIResponse(prompt);
    const aiRecommendation = extractJSON(text);
    strategies.push({ cluster_id: cluster.cluster_id, recommended_strategy: aiRecommendation.recommended_strategy, recommendation_reason: aiRecommendation.reason, existing_risk: existing, incoming_risk: incoming });
  }
  return strategies;
}

export async function suggestRemediation(risk: any, currentControls: any[]) {
  const prompt = `Suggest remediation for risk: ${risk.title}. Current controls: ${JSON.stringify(currentControls)}
  Return JSON Array: [{ "action_title": "...", "description": "...", "priority": "HIGH", "suggested_due_date_days": 30 }]`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function processRiskAnalysis(riskId: string, tenantId: string, force: boolean = false): Promise<any> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
  const idColumn = isUuid ? 'risk_id' : 'risk_code';
  const risk = (await query(`SELECT * FROM risks WHERE ${idColumn} = $1 AND tenant_id = $2`, [riskId, tenantId])).rows[0];
  if (!risk) throw new Error('Risk not found');
  if (!force && risk.analysis) return risk.analysis;

  const prompt = `Provide strategic analysis of risk: ${risk.statement}
  Return JSON: { "enhancedDescription": "...", "impact": "...", "mitigationSuggestions": [], "score": { "suggestedLikelihood": 1, "suggestedImpact": 1, "reasoning": "..." } }`;
  const text = await generateAIResponse(prompt);
  const analysis = extractJSON(text);
  await query('UPDATE risks SET analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE risk_id = $2', [JSON.stringify(analysis), risk.risk_id]);
  return analysis;
}

export async function analyzeRiskCorrelations(riskIds: string[] | undefined, tenantId: string) {
  let queryText = 'SELECT risk_id, risk_code, statement, category FROM risks WHERE tenant_id = $1 AND status = \'ACTIVE\'';
  const params: any[] = [tenantId];
  if (riskIds?.length) { queryText += ' AND risk_id = ANY($2)'; params.push(riskIds); }
  const risks = (await query(queryText, params)).rows;
  if (risks.length < 2) return { correlations: [] };

  const prompt = `Analyze risk correlations: ${JSON.stringify(risks)}
  Return JSON: { "correlations": [{ "source_risk_id": "...", "target_risk_id": "...", "relationship_type": "...", "strength": 0.8 }] }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function calibrateRiskAppetite(risks: any[], _tenantId: string) {
  const prompt = `Calibrate risk appetite. Risks: ${risks.length}, Avg Score: ${risks.reduce((a, b) => a + (b.inherent_risk_score || 0), 0) / risks.length}.
  Return JSON: { "suggested_thresholds": { "low": 20, "medium": 40, "high": 60, "critical": 80 }, "appetite_statement": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function simulateDecisionImpact(scenario: string, risks: any[], _tenantId: string) {
  const prompt = `Simulate impact of decision "${scenario}" on risks: ${JSON.stringify(risks.slice(0, 20))}
  Return JSON: { "impacted_risks": [], "new_risks_emerging": [], "executive_summary": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}

export async function assessVendorRisk(vendor: any) {
  const prompt = `Assess vendor risk: ${vendor.vendor_name} (${vendor.category}).
  Return JSON: { "risk_score": 70, "findings": [], "compliance_requirements": [], "reasoning": "..." }`;
  const text = await generateAIResponse(prompt);
  const aiResult = extractJSON(text);
  return { ...aiResult, threat_signals: [] };
}

export async function generateStakeholderBrief(targetAudience: string, riskContext: any) {
  const prompt = `Generate stakeholder brief for ${targetAudience}. Context: ${JSON.stringify(riskContext)}
  Return JSON: { "subject": "...", "summary": "...", "key_actions": [], "tone": "..." }`;
  const text = await generateAIResponse(prompt);
  return extractJSON(text);
}
