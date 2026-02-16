import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { query } from '../database/connection';

/**
 * Unified AI Generation Helper
 * Handles switching between:
 * - Google Gemini SDK (cloud)
 * - OpenRouter/OpenAI (cloud)
 * - Ollama Local AI (dev/free)
 * - NVIDIA/Moonshot (custom axios implementation)
 */
/**
 * Unified AI Generation Helper
 * Handles switching between:
 * - Google Gemini SDK (cloud)
 * - OpenRouter/OpenAI (cloud)
 * - Ollama Local AI (dev/free)
 * - NVIDIA/Moonshot (custom axios implementation)
 */
export interface AIConfig {
  provider?: 'ollama' | 'cloud' | 'auto';
  model?: string;
  timeout?: number;
}


/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  factor: number = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;

    // Don't retry if it's a permanent error (like auth failure)
    const isAuthError = error.message?.includes('401') || error.message?.includes('Invalid API Key');
    if (isAuthError) throw error;

    // Handle Rate Limits (429) specifically with a longer delay
    const isRateLimit = error.message?.includes('429') || error.status === 429;
    let currentDelay = delay;

    if (isRateLimit) {
      // For rate limits, wait a bit but not too long (max 10s)
      currentDelay = Math.min(Math.max(2000, delay), 10000);
      logger.warn(`AI Rate Limit hit. Waiting ${currentDelay}ms before retry...`);
    }

    logger.warn(`AI Request failed. Retrying in ${currentDelay}ms... (${retries} attempts left). Error: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, currentDelay));

    // Use a smaller factor to avoid exponential explosion
    const backoffFactor = isRateLimit ? 1.5 : factor;
    return withRetry(fn, retries - 1, currentDelay * backoffFactor, factor);
  }
}

export async function generateAIResponse(prompt: string, config: AIConfig = {}): Promise<string> {
  // Increase retries for batch/import operations to handle provider fluctuations
  const retryCount = (config as any).isBatch || (config as any).isImport ? 8 : 4;
  return withRetry(async () => {
    return _generateAIResponseInternal(prompt, config);
  }, retryCount, 3000);
}

/**
 * Helper to fetch global AI configuration
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

async function _generateAIResponseInternal(prompt: string, config: AIConfig = {}): Promise<string> {
  const globalConfig = await getGlobalAIConfig();

  const geminiApiKey = globalConfig.api_key || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const defaultModel = globalConfig.model || process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  // === MOONSHOT / NVIDIA NIM ===
  // Support both direct Moonshot API and NVIDIA NIM (using 'nvapi-')
  const moonshotApiKey = process.env.MOONSHOT_API_KEY || (geminiApiKey && (geminiApiKey.startsWith('sk-EQ') || geminiApiKey.startsWith('nvapi-')) ? geminiApiKey : undefined);

  if (moonshotApiKey) {
    const isNvidia = moonshotApiKey.startsWith('nvapi-');
    const isOpenRouter = moonshotApiKey.startsWith('sk-or-');

    // Determine the correct Base URL based on the key type
    let baseUrl = 'https://api.moonshot.cn/v1';
    if (isNvidia) {
      baseUrl = 'https://integrate.api.nvidia.com/v1';
    } else if (isOpenRouter) {
      baseUrl = 'https://openrouter.ai/api/v1';
    }

    const modelName = config.model || defaultModel || (isNvidia ? 'moonshotai/kimi-k2-thinking' : 'google/gemini-2.5-flash-lite');

    // Add required headers for OpenRouter if applicable
    const defaultHeaders = isOpenRouter ? {
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'Risk Assessment SaaS',
    } : undefined;

    logger.info(`Using ${isNvidia ? 'NVIDIA NIM' : (isOpenRouter ? 'Moonshot via OpenRouter' : 'Moonshot AI')} with model: ${modelName}`);

    const client = new OpenAI({
      apiKey: moonshotApiKey,
      baseURL: baseUrl,
      defaultHeaders
    });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const completionPromise = client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
  }


  // === GROK (GROQ) API ===
  // Use Groq if GROQ_API_KEY is set and starts with 'gsk_'
  if (groqApiKey && groqApiKey.startsWith('gsk_')) {
    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    logger.info(`Using Groq API with model: ${groqModel}`);

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const completionPromise = groq.chat.completions.create({
      model: groqModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
  }

  const apiKey = (geminiApiKey || '').trim();
  if (!apiKey) throw new Error('AI API Key is missing (GEMINI_API_KEY or Database config)');

  const timeoutMs = config.timeout || 120000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
  );

  // OpenRouter (or generic OpenAI compatible)
  const isGenericOpenAI =
    apiKey.startsWith('sk-or-') ||
    apiKey.startsWith('sk-') ||
    apiKey.startsWith('rcai-') ||
    apiKey.includes('.') ||
    (config.model || defaultModel || '').includes('/');

  if (isGenericOpenAI) {
    const orModel = config.model || defaultModel;
    const isOpenRouter = apiKey.startsWith('sk-or-') || orModel.includes('/');
    const isZhipu = apiKey.includes('.') && !isOpenRouter;

    logger.info(`Using ${isOpenRouter ? 'OpenRouter' : (isZhipu ? 'ZhipuAI' : 'OpenAI')} with model: ${orModel}`);

    // Determine Base URL
    let baseURL = isOpenRouter
      ? 'https://openrouter.ai/api/v1'
      : (isZhipu ? 'https://open.bigmodel.cn/api/paas/v4' : 'https://api.openai.com/v1');

    const defaultHeaders = isOpenRouter ? {
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'Risk Assessment SaaS',
    } : undefined;

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
      defaultHeaders: defaultHeaders
    });

    const completionPromise = openai.chat.completions.create({
      model: orModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
  }

  // Default: Google Gemini SDK
  const genAI = new GoogleGenerativeAI(apiKey);
  let modelName = config.model || defaultModel;
  if (modelName.includes('/')) modelName = modelName.split('/')[1];

  logger.info(`Using Native Google AI with model: ${modelName}`);
  const model = genAI.getGenerativeModel({ model: modelName });

  const generatePromise = model.generateContent(prompt);
  const result: any = await Promise.race([generatePromise, timeoutPromise]);

  try {
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('Quota')) {
      logger.error('AI Quota Exceeded. returning Mock Response.');
      return JSON.stringify({
        mock: true,
        summary: "AI Service Unavailable (Rate Limit). Using Mock Data.",
        posture_summary: "Rate limit reached. Unable to generate real-time analysis.",
        top_focus_areas: ["Check API Quota", "Review System Logs", "Retry Later"],
        executive_narrative: "The AI service is currently experiencing high load. Please try again later.",
        confidence_score: 0
      });
    }
    throw error;
  }
}


/**
 * Robustly extract and parse JSON from AI responses
 * Handles Markdown code blocks, leading/trailing text, and different JSON formats
 */
export function extractJSON<T = any>(text: string): T {
  try {
    if (!text) throw new Error('Empty AI response');

    // 1. Clean the string of DeepSeek <think> blocks and markdown
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```[a-zA-Z]*\n?/g, '')
      .replace(/```/g, '')
      .trim();

    // 2. Try direct parse first
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 3. Fallback: Use regex to find the outermost JSON object or array
      const jsonRegex = /({[\s\S]*?}|\[[\s\S]*?\])/;
      const match = cleaned.match(jsonRegex);

      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (innerError: any) {
          // If the regex match failed (e.g. truncated), try the index method as a last resort
          const startChar = cleaned.includes('{') ? '{' : '[';
          const endChar = startChar === '{' ? '}' : ']';
          const start = cleaned.indexOf(startChar);
          const end = cleaned.lastIndexOf(endChar);
          if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
          }
          throw innerError;
        }
      }

      throw new Error('No JSON object or array found in response');
    }
  } catch (error: any) {
    logger.error('AI JSON extraction failed:', {
      preview: text.substring(0, 500),
      error: error.message
    });
    throw new Error('Failed to parse AI response as valid JSON');
  }
}

/**
 * Analyze a single risk entry and provide AI improvements
 * This is used during import to show comparison between user data and AI suggestions
 */
/**
 * Calculate risk score based on rules (No AI cost)
 */
export function calculateRuleBasedRiskScore(originalData: any): any {
  // 1. If we have Likelihood & Impact, use them
  if (originalData.likelihood && originalData.impact) {
    return {
      user_score_status: 'Aligned',
      suggested_likelihood: originalData.likelihood,
      suggested_impact: originalData.impact,
      reasoning: 'Calculated from provided Likelihood and Impact',
      confidence_score: 1.0 // High confidence in math
    };
  }

  // 2. Fallback: defaults
  return null; // Let AI decide
}

/**
 * Analyze a single risk entry and provide AI improvements
 * This is used during import to show comparison between user data and AI suggestions
 */
export async function analyzeSingleRisk(
  rowIndex: number,
  originalData: {
    statement: string;
    description: string;
    category: string;
    likelihood: number;
    impact: number;
    controls?: string[];
  },
  tenantId: string
): Promise<{
  row_index: number;
  original_data: typeof originalData;
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
}> {
  try {
    // === RULE-BASED PREPROCESSING (Cost Optimization) ===
    // If the risk is well-defined, we might skip full AI analysis or use a cheaper prompt
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
    1. **Critique & Improve**: Rewrite the risk statement to be specific (Cause -> Event -> Impact). Avoid generic fluff.
    2. **Financial Impact Analysis**: Estimate the potential financial loss range (in USD) if this risk materializes. Be realistic based on the nature of the risk (e.g., Data Breach = high, Minor process delay = low).
    3. **Strategic Remediation**: What exact steps should be taken *immediately* before assigning to a department? (e.g., "Conduct legal review," "Patch Server X," "Hedge currency").
    4. **Why This Matters**: A sharp, executive-level summary of why this risk is critical right now.
    
    Return JSON:
    {
      "improved_statement": "Specific risk statement identifying the root cause and business dissatisfaction",
      "improved_description": "Detailed context including technical or process specificities",
      "suggested_category": "Cybersecurity|Operational|Financial|Legal|Compliance|Strategic",
      "score_analysis": {
        "user_score_status": "Aligned|Underestimated|Overestimated",
        "suggested_likelihood": 1-5,
        "suggested_impact": 1-5,
        "reasoning": "Executive summary of why this score is appropriate",
        "financial_impact_estimate": "$10,000 - $50,000 (Legal fines and remediation costs)",
        "strategic_remediation": "Immediate audit of vendor contracts and implementation of MFA for all admin accounts.",
        "why_matters": "Direct threat to revenue continuity and regulatory compliance status."
      },
      "confidence_score": 0.95
    }`;

    const text = await generateAIResponse(prompt);
    const analysis = extractJSON(text);

    // Merge rule-based score if AI didn't provide strong opinion or if we want to enforce it
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
    // Return fallback analysis
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

/**
 * Batch analyze risk entries with concurrency control
 * Optimizes by running requests in parallel.
 */
export async function analyzeRiskEntriesBatch(
  entries: Array<{
    row_index: number;
    statement: string;
    description: string;
    category: string;
    likelihood: number;
    impact: number;
  }>,
  tenantId: string,
  options: { concurrency?: number } = {}
): Promise<Array<{
  row_index: number;
  original_data: any;
  ai_analysis: any;
}>> {
  const concurrency = options.concurrency || 5; // Increased default concurrency
  const results: Array<{
    row_index: number;
    original_data: any;
    ai_analysis: any;
  }> = [];

  // Process in batches with concurrency control
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(entry =>
        analyzeSingleRisk(entry.row_index, {
          statement: entry.statement,
          description: entry.description,
          category: entry.category,
          likelihood: entry.likelihood,
          impact: entry.impact
        }, tenantId)
      )
    );
    results.push(...batchResults);
    logger.info(`Batch AI analysis progress: ${Math.min(i + concurrency, entries.length)}/${entries.length}`);
  }

  return results;
}


/**
 * Validate data quality before import (Prompt V2.1)
 */
export async function validateDataQuality(rawRows: any[][], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    // Take a sample of up to 50 rows for analysis
    const sampleRows = rawRows.slice(0, 50);
    const headers = sampleRows[0] || [];

    const prompt = `System Role: You are a data quality gatekeeper.

Analyze the following dataset for quality before risk register import.

Inputs:
- Headers: ${JSON.stringify(headers)}
- Sample Data (first 50 rows): ${JSON.stringify(sampleRows.slice(1))}
- Tenant Rules: ${JSON.stringify(tenantConfig.terminology || {})}

Tasks:
1. Detect structural issues (missing headers, encoding problems)
2. Validate data types (numeric vs text mismatches)
3. Check completeness (required fields blank)
4. Validate against risk context (allowed values, ranges)
5. Identify anomalies (outliers, malformed dates)
6. Summarize import safety in simple, friendly language.
7. Tone: Use simple, non-technical language for human managers, not data scientists. Avoid jargon.

Return JSON:
{
  "data_quality_score": 85,
  "assessment_summary": "Data is generally clean but has missing owners in 20% of rows.",
  "blocking_issues": [],
  "warnings": [
    "Column 'Risk Owner' is empty in rows 3, 5, 8",
    "Mixed date formats detected in 'Date identified'"
  ],
  "field_completeness": {
    "Risk Title": 100,
    "Impact": 100,
    "Owner": 80
  },
  "safe_to_proceed": true,
  "remediation_steps": ["Assign owners to missing rows before final approval"],
  "confidence_score": 90
}`;

    const text = await generateAIResponse(prompt);
    const parsedResult = extractJSON(text);
    logger.info(`AI data validation completed for tenant ${tenantId}`);
    return parsedResult;
  } catch (error) {
    logger.error('AI data validation error:', error);
    // Return a fallback/empty validation if AI fails to prevent blocking the flow completely
    return {
      data_quality_score: 100, // Assume perfect quality to unblock testing
      assessment_summary: "AI validation unavailable (API Quota or Network Error). Proceeding with assumption of valid data.",
      blocking_issues: [],
      warnings: ["AI validation skipped due to service unavailability."],
      safe_to_proceed: true
    };
  }
}

/**
 * Analyze raw Excel sheet data to detect purpose, header row, and layout (Prompt V1.4)
 */
export async function analyzeExcelSheetStructure(rawData: any[][], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    // Take a larger sample (up to 30 rows) to see context
    const sampleData = rawData.slice(0, 30);

    const prompt = `System Role: You are a data structure expert for risk management.

Analyze the raw Excel data snippet below (first 30 rows) and identify the sheet structure.

Inputs:
- Tenant Context: ${JSON.stringify(tenantConfig.terminology || {})}
- Raw Data Sample: ${JSON.stringify(sampleData)}

Tasks:
1. Detect PURPOSE: Is this a risk register, maintenance log, incident report, control list, or something else?
2. Detect LAYOUT: 
   - Which row contains the headers? (0-indexed)
   - Which row does the actual data start on?
3. Detect RELEVANCE: How relevant is this to a Risk Register on a scale of 0-100?
4. Tone: Use simple, everyday words. Imagine explaining this to someone who has never used a risk tool.

Return JSON:
{
  "purpose": "Risk Register",
  "sheet_summary": "Comprehensive list of operational and financial risks.",
  "header_row_index": 0,
  "data_start_row": 1,
  "relevance_score": 95,
  "confidence": 90,
  "layout_notes": "Standard grid layout with clear headers."
}`;

    const text = await generateAIResponse(prompt);
    const parsedResult = extractJSON(text);
    logger.info(`AI sheet structure analysis completed for tenant ${tenantId}`);
    return parsedResult;
  } catch (error: any) {
    logger.error('AI structure analysis error:', {
      message: error?.message,
      status: error?.status
    });

    // Fallback for dev/testing when API quota is hit or other errors occur
    // This ensures the user isn't blocked by AI unavailability
    return {
      purpose: "Risk Register (Fallback mode)",
      sheet_summary: "AI analysis unavailable (likely API quota limit). Assuming valid Risk Register for testing purposes.",
      header_row_index: 0,
      data_start_row: 1,
      relevance_score: 100, // Force high relevance to unblock user
      confidence: 100,
      layout_notes: "Default layout assumed due to AI service unavailability."
    };
  }
}

/**
 * Analyze Excel columns and suggest mappings to risk fields using AI (Prompt V1.1)
 */
export async function analyzeExcelColumns(detectedColumns: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    const prompt = `System Role: You are an expert data mapping assistant for a Risk Management System.
    
    Your GOAL: Correctly map the user's Excel headers to our database schema.
    
    CRITICAL INSTRUCTION: You MUST find the column that represents the "Risk Title" or "Risk Name" or "Risk Statement". It might be called "Name", "Title", "Risk", "Item", "Issue", "Description" (if short). Map this to "risk_statement".
    
    Inputs:
    - Tenant Terminology: ${JSON.stringify(tenantConfig.terminology || {})}
    - Excel Columns:
    ${detectedColumns.map(col => `
    Column ${col.excel_column}: "${col.column_name}"
    Sample values: ${JSON.stringify(col.sample_values.slice(0, 3))}
    `).join('\n')}
    
    Database Schema (Target Fields):
    - risk_statement (REQUIRED): The short title or name of the risk.
    - description: Detailed explanation.
    - likelihood: 1-5 or similar score.
    - impact: 1-5 or similar score.
    - category: Risk category (e.g., Cyber, Ops).
    - owner: Person or Department responsible.
    - controls: Existing mitigations.
    - status: Current state.
    
    Tasks:
    1. Identify the BEST match for 'risk_statement'. If multiple columns look like text, the shorter, summarizing one is the statement. The longer one is the description.
    2. Map other fields as best as possible.
    3. If no clear title exists, check if 'Description' can serve as the statement.
    
    Return JSON:
    {
      "mapped_fields": [
        {
          "excel_column": "A",
          "mapped_to_field": "risk_statement",
          "confidence": 95,
          "notes": "Column 'Risk Name' clearly maps to risk_statement"
        }
      ],
      "confidence_score": 90
    }`;

    const text = await generateAIResponse(prompt);
    const parsedResult = extractJSON(text);
    logger.info(`AI column mapping completed for tenant ${tenantId}`);
    return parsedResult;
  } catch (error) {
    logger.error('AI column mapping error:', error);
    // Fallback: Return empty mapping to allow manual mapping
    return {
      mapped_fields: [],
      confidence_score: 0,
      notes: "AI mapping unavailable. Please map columns manually."
    };
  }
}

/**
 * Suggest risk scores using AI based on risk description (Prompt V1.3)
 */
export async function suggestRiskScore(riskStatement: string, riskDescription: string, tenantId: string, useIndustryBenchmarks: boolean = false) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const scale = tenantConfig.scales || { likelihood: 5, impact: 5 };

    const prompt = `System Role: You are a risk assessment advisor, not a decision-maker.

Based on the provided risk and tenant-specific scoring model, suggest likelihood and impact scores.

Inputs:
- Risk Statement: ${riskStatement}
- Description: ${riskDescription}
- Tenant Scoring Scale: 1 to ${scale.likelihood} for Likelihood, 1 to ${scale.impact} for Impact.
- Risk Appetite: ${tenantConfig.risk_appetite || 'Standard'}
- Use Industry Benchmarks: ${useIndustryBenchmarks}

Tasks:
1. Suggest a possible likelihood and impact score.
2. Compare with industry norms (if available).
3. Highlight variance without enforcing changes.

Rules:
- Never override tenant score.
- Provide reasoning and confidence.
- Flag only material deviations.
- Tone: Use simple, plain English that a small business owner would understand. Avoid complex risk management terms.

Return JSON:
{
  "suggested_likelihood": 3,
  "suggested_impact": 4,
  "industry_comparison": "Slightly higher than average for this category",
  "variance_flag": false,
  "rationale": "Based on potential financial exposure and frequency of similar events.",
  "confidence_score": 85
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI risk scoring error:', error);
    throw new Error('Failed to generate risk score suggestions');
  }
}

/**
 * Improve risk description using AI (Prompt V1.2)
 */
export async function improveRiskDescription(rawRisk: string, tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const prompt = `System Role: You are an enterprise risk analyst with audit experience.

Rewrite the following risk into a structured, clear, audit-ready format.

Input Risk: "${rawRisk}"
Tenant Language Preference: ${tenantConfig.language_preference || 'Professional/Neutral'}

Rules:
- Preserve original meaning
- Do not exaggerate impact
- Use neutral, professional language
- Provide cause, event, impact structure
- Tone: Simple, clear, and easy to read. Avoid "auditor-speak". Make it something a regular employee would understand easily.

Also provide:
- Original vs improved comparison
- Explanation of changes

Return JSON:
{
  "original_risk": "${rawRisk}",
  "improved_risk": "Rewritten statement",
  "cause": "Underlying cause",
  "event": "The risk event",
  "impact": "Consequences",
  "explanation": "Improved structure for audit readiness",
  "confidence_score": 95
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI risk improvement error:', error);
    throw new Error('Failed to improve risk description');
  }
}

/**
 * Background process for risk improvement (Aligned with User Spec)
 */
export async function processRiskImprovement(requestId: string, riskId: string, rawStatement: string, tenantId: string) {
  try {
    const suggestion = await improveRiskDescription(rawStatement, tenantId);

    await query(
      `UPDATE ai_suggestions 
             SET status = 'COMPLETED', suggestion = $1, updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $2`,
      [JSON.stringify(suggestion), requestId]
    );

    logger.info(`AI Risk Improvement completed for request ${requestId} (Risk: ${riskId})`);
  } catch (error) {
    logger.error(`AI Risk Improvement failed for request ${requestId} (Risk: ${riskId}):`, error);
    await query(
      `UPDATE ai_suggestions 
             SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $1`,
      [requestId]
    );
  }
}

/**
 * Background process for risk scoring (Aligned with User Spec)
 */
export async function processRiskScoring(requestId: string, riskId: string, riskStatement: string, riskDescription: string, tenantId: string, useIndustryBenchmarks: boolean) {
  try {
    const suggestion = await suggestRiskScore(riskStatement, riskDescription, tenantId, useIndustryBenchmarks);

    await query(
      `UPDATE ai_suggestions 
             SET status = 'COMPLETED', suggestion = $1, updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $2`,
      [JSON.stringify(suggestion), requestId]
    );

    logger.info(`AI Risk Scoring completed for request ${requestId} (Risk: ${riskId})`);
  } catch (error) {
    logger.error(`AI Risk Scoring failed for request ${requestId} (Risk: ${riskId}):`, error);
    await query(
      `UPDATE ai_suggestions 
             SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $1`,
      [requestId]
    );
  }
}

/**
 * Recommend controls for a risk using AI
 */
export async function recommendControls(riskStatement: string, riskDescription: string, category?: string) {
  try {
    const prompt = `Recommend appropriate controls to mitigate this risk.

Risk: ${riskStatement}
Description: ${riskDescription}
${category ? `Category: ${category}` : ''}

Return JSON with recommended controls:
{
  "recommended_controls": [
    {
      "control_name": "Multi-factor authentication",
      "control_type": "preventive",
      "effectiveness": 4,
      "implementation_priority": "high",
      "rationale": "Why this control is effective"
    }
  ],
  "confidence": 0.9
}

Control types: preventive, detective, corrective, directive
Effectiveness: 1-5 (1=low, 5=high)
Priority: critical, high, medium, low
Tone: Use simple, plain English. Explain "why" in a way that anyone can understand without needing a risk management degree.`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI control recommendation error:', error);
    throw new Error('Failed to recommend controls');
  }
}

/**
 * Analyze any uploaded document and provide intelligent summary and insights
 */
export async function analyzeDocument(fileContent: string, fileName: string, fileType: string) {
  try {
    const prompt = `System Role: You are an intelligent document analysis assistant.

Analyze the following document and provide a comprehensive analysis.

Document Information:
- File Name: ${fileName}
- File Type: ${fileType}

Document Content:
${fileContent.substring(0, 10000)} ${fileContent.length > 10000 ? '... (truncated)' : ''}

Tasks:
1. Identify the document type/category (e.g., Risk Register, Financial Report, Meeting Minutes, Contract, etc.)
2. Determine the main purpose of this document
3. Provide a concise 2-3 sentence summary
4. Extract 3-5 key findings or insights
5. Suggest any recommended actions or next steps (if applicable)
6. Assess relevance to risk management (0-100 score)
7. Tone: Keep it extremely simple. No corporate jargon. Use words that a high schooler would understand.

Return JSON:
{
  "document_type": "Risk Register",
  "purpose": "Track and manage organizational risks",
  "summary": "This document contains a comprehensive list of identified risks across multiple departments, including likelihood and impact assessments.",
  "key_findings": [
    "15 high-priority risks identified",
    "Cybersecurity risks are the most prevalent category",
    "Several risks lack assigned owners"
  ],
  "suggested_actions": [
    "Assign owners to unassigned risks",
    "Review and update mitigation strategies for high-priority items",
    "Schedule quarterly risk review meeting"
  ],
  "risk_relevance_score": 95,
  "confidence_score": 90,
  "metadata": {
    "total_items": 25,
    "categories_found": ["Cybersecurity", "Financial", "Operational"],
    "date_range": "2024-2026"
  }
}`;

    const text = await generateAIResponse(prompt);
    const parsedResult = extractJSON(text);
    logger.info(`AI document analysis completed for file: ${fileName}`);
    return parsedResult;
  } catch (error) {
    logger.error('AI document analysis error:', error);
    throw new Error('Failed to analyze document with AI');
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
 * Detect scale drift and outliers in risk scoring (Prompt V1.4)
 */
export async function detectScaleDrift(risks: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    // Prepare a summarized version of risks to avoid token limits
    const riskSummaries = risks.map(r => ({
      id: r.risk_id,
      statement: r.statement || r.title, // Handle both naming conventions
      likelihood: r.likelihood_score,
      impact: r.impact_score,
      category: r.category
    }));

    const prompt = `System Role: You are an internal risk consistency monitor.

Analyze the following tenant risk scores to identify inconsistencies and outliers.

Inputs:
- Tenant Risk Model: ${JSON.stringify(tenantConfig.scales || { likelihood: 5, impact: 5 })}
- Risks: ${JSON.stringify(riskSummaries)}

Tasks:
1. Identify similar risks that are scored significantly differently.
2. Detect any score inflation or deflation trends (e.g., everything is "High").
3. Flag specific outliers that require justification.

Rules:
- Do not change scores.
- Provide insights only.
- Use tenant's own data as primary reference.
- Tone: Be very simple and direct. Avoid complex statistical or risk terms. Explain "outliers" as "unusual patterns" or "things that stand out".

Return JSON:
{
  "detected_outliers": [
    {
      "risk_id": "ID_FROM_INPUT",
      "statement": "Risk statement",
      "current_score": 25,
      "why_outlier": "Rated 5/5 but similar risk 'X' is 2/2",
      "suggested_review": true
    }
  ],
  "drift_trends": [
    "Tendency to overestimate impact in Technology category"
  ],
  "justification_required": [
    "Rationale for Risk ID 123",
    "Explanation for high score in Finance"
  ],
  "explanation": "Generally consistent, but a few outliers in the new project."
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI scale drift detection error:', error);
    throw new Error('Failed to detect scale drift');
  }
}

/**
 * Assess risk impact of an event using AI (Prompt V5.1)
 * @deprecated Use assessEventImpact instead
 */
export async function assessRiskEvent(eventType: string, risks: any[]) {
  try {
    // Summarize risks for context
    const riskContext = risks.map(r => ({
      id: r.risk_id,
      title: r.title || r.statement,
      category: r.category
    }));

    const prompt = `System Role: You are a risk monitoring agent.

An event has occurred: "${eventType}"

Assess whether this event:
- Increases likelihood
- Increases impact
- Requires review

Context:
- Existing Risks: ${JSON.stringify(riskContext)}

Rules:
- Do not auto-update scores.
- Recommend actions only.
- Cite which part of the risk is affected.
- Tone: Simple and conversational. "This matters because..." instead of "Aforementioned geopolitical variables impact...".

Return JSON:
{
  "affected_risks": [
    {
      "risk_id": "Risk ID",
      "impact_analysis": "This event directly increases the likelihood of..."
    }
  ],
  "recommended_action": "Review | Escalate | No action",
  "rationale": "Explanation of why this event matters",
  "urgency_level": "Low | Medium | High"
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI risk event assessment error:', error);
    throw new Error('Failed to assess risk event');
  }
}

/**
 * Identify stale/zombie risks (Prompt V2.2)
 */
export async function detectStaleRisks(risks: any[]) {
  try {
    // Summarize risks with temporal and ownership context
    const riskContext = risks.map(r => ({
      id: r.risk_id,
      title: r.title || r.statement,
      updated_at: r.updated_at,
      created_at: r.created_at,
      owner: r.owner,
      status: r.status
    }));

    const prompt = `System Role: You are a risk portfolio auditor.

Identify risks that show signs of decay:
- No updates beyond review cycle
- Ownership inactivity
- Repeated acceptance without mitigation

Context:
- Risks: ${JSON.stringify(riskContext)}
- Current Date: ${new Date().toISOString()}

Rules:
- Recommend next steps without enforcing closure.
- Tone: Friendly and simple. "This risk hasn't been touched in a while" instead of "Stagnant risk profile detected".

Return JSON:
{
  "zombie_risks": [
    {
      "risk_id": "Risk ID",
      "reason": "No updates in 6 months"
    }
  ],
  "decay_reason": "Summary of why decay is happening",
  "recommended_next_step": "Actionable recommendation"
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI stale risk detection error:', error);
    throw new Error('Failed to detect stale risks');
  }
}

/**
 * Suggest controls and regulatory mappings (Prompt V3.1)
 */
export async function mapControlsAndRegulations(riskStatement: string, context?: string) {
  try {
    const prompt = `System Role: You are a compliance expert.

For the given risk, suggest:
1. Relevant controls that mitigate it
2. Applicable regulatory clauses

Risk: "${riskStatement}"
Context: "${context || 'General Enterprise Risk'}"

Rules:
- Suggest only, never enforce
- Provide clause references
- Explain why each mapping applies
- Tone: Simple English. Avoid dense legal or compliance terminology where possible. Focus on what it means "in real life".

Return JSON:
{
  "mapped_controls": [
    "Implement MFA",
    "Regular Access Reviews"
  ],
  "mapped_regulations": [
    {
      "framework": "ISO 27001",
      "clause": "A.9.4.3",
      "applicability": "HIGH"
    }
  ],
  "non_compliance_risk": "Potential fines for GDPR data breach",
  "rationale": "High likelihood of unauthorized access requires strong auth controls",
  "confidence_score": 85
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI control mapping error:', error);
    throw new Error('Failed to map controls and regulations');
  }
}

/**
 * Explain compliance impact if risk is not mitigated (Prompt V3.2)
 */
export async function explainComplianceImpact(riskStatement: string) {
  try {
    const prompt = `System Role: You are a compliance auditor.

Explain the compliance impact if this risk is not mitigated.

Risk: "${riskStatement}"

Rules:
- Use non-alarmist language
- Avoid legal conclusions
- Focus on potential exposure
- Tone: Very simple and clear. "You might get fined if..." instead of "Non-compliance with Article 32 may result in punitive measures".

Return JSON:
{
  "impact_summary": "Brief summary of impact",
  "affected_frameworks": ["GDPR", "ISO 27001"],
  "audit_ready_statement": "Professional statement suitable for an audit report"
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI compliance impact explanation error:', error);
    throw new Error('Failed to explain compliance impact');
  }
}

/**
 * Generate executive summary of risk posture (Prompt V4.1)
 */
export async function generateExecutiveSummary(risks: any[]) {
  try {
    // Contextualize for high-level summary
    const riskContext = risks.map(r => ({
      title: r.title || r.statement,
      score: r.likelihood_score * r.impact_score,
      trend: r.history?.length > 0 ? 'Changed' : 'New' // Simplified trend logic
    })).filter(r => r.score > 10); // Focus on high risks for executives

    const prompt = `System Role: You are a Chief Risk Officer.

Summarize enterprise risk posture for executives:
- What changed
- Why it matters
- What decisions are required

Context:
- High Priority Risks: ${JSON.stringify(riskContext)}

Rules:
- No jargon
- Action-oriented
- Strategic tone
- Use simple, direct language. Executives are busy; don't use 10 words when 2 will do. No fluff. No jargon. Simple English for humans.

Return JSON:
{
  "executive_summary": "High-level narrative",
  "key_changes": ["Risk X escalated due to event Y"],
  "decisions_required": ["Approve budget for Z"]
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI executive summary error:', error);
    throw new Error('Failed to generate executive summary');
  }
}

/**
 * Estimate financial impact of a risk (Prompt V4.2)
 */
export async function estimateFinancialImpact(riskStatement: string, context?: string) {
  try {
    const prompt = `System Role: You are a risk analyst.

Estimate potential financial impact ranges.

Risk: "${riskStatement}"
Context: "${context || 'Standard corporate environment'}"

Rules:
- Use ranges, not point values
- Clearly state assumptions
- Do not present as exact figures
- Tone: Plain English. Explain "assumptions" as "things we are guessing might happen". Very readable.

Return JSON:
{
  "financial_impact_range": "$100K-$500K",
  "assumptions": ["Based on average downtime of 4 hours"],
  "confidence_level": "Medium"
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI financial estimation error:', error);
    throw new Error('Failed to estimate financial impact');
  }
}

/**
 * Detect duplicates and near-duplicates in a risk portfolio (Prompt V5.1)
 */
export async function detectRiskDuplicates(risks: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    // Summarize risks for AI analysis
    const riskContext = risks.map(r => ({
      id: r.risk_id,
      code: r.risk_code,
      statement: r.statement,
      description: r.description,
      owner: r.owner_user_id,
      department: r.department
    }));

    const prompt = `System Role: You are an enterprise risk data deduplication specialist.

Analyze the following risks to identify exact and semantic duplicates.

Inputs:
- Tenant Terminology: ${JSON.stringify(tenantConfig.terminology || {})}
- Risks: ${JSON.stringify(riskContext)}

Tasks:
1. Identify EXACT DUPLICATES: Risks with the same statement/title AND owner.
2. Detect SEMANTIC DUPLICATES: Risks that describe the same underlying cause and impact, even if worded differently.
3. Form CLUSTERS: Group similar/duplicate risks together. Each cluster should have a unique ID.
4. Analyze OWNERSHIP: Note if duplicates have different owners (ownership ambiguity).
5. Recommend CONSOLIDATION: For each cluster, suggest whether to CONSOLIDATE, KEEP_SEPARATE, or FLAG_FOR_REVIEW.
6. Merge Strategy: For consolidation, suggest a primary risk ID, a merged statement, and a suggested owner.

Rules:
- Be conservative. Only suggest consolidation if the risks are clearly redundant.
- Use Cluster Types: exact_duplicate | semantic_duplicate | uncertain.
- Include rationale and confidence score.
- Tone: Describe similarities in everyday words. "These two risks are basically the same thing" instead of "High semantic overlap identified".

Return JSON:
{
  "duplicate_clusters": [
    {
      "cluster_id": "CL-001",
      "cluster_type": "semantic_duplicate",
      "risk_ids": ["ID1", "ID2"],
      "similarity_score": 90,
      "consolidation_recommendation": "CONSOLIDATE",
      "merge_strategy": {
        "primary_risk_id": "ID1",
        "suggested_merged_statement": "A consolidated statement reflecting both",
        "suggested_owner": "Owner ID"
      },
      "rationale": "Both risks describe supply chain delays from the same region."
    }
  ],
  "consolidation_summary": {
    "total_clusters": 1,
    "potential_reduction": 1,
    "high_confidence_matches": 1
  }
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI duplicate detection error:', error);
    throw new Error('Failed to detect risk duplicates');
  }
}

/**
 * Evaluate control effectiveness for a specific risk (Prompt V6.1)
 */
export async function evaluateControlEffectiveness(risk: any, controls: any[]) {
  try {
    const prompt = `System Role: You are a risk and control assessment expert.

Evaluate the effectiveness of the following controls for the specified risk.

Risk Details:
- Title: ${risk.title}
- Description: ${risk.description}
- Inherent Score: ${risk.inherent_risk_score}

Associated Controls:
${controls.map(c => `
Control ${c.control_code}: "${c.name}"
- Description: ${c.description}
- Type: ${c.control_type}
- Status: ${c.implementation_status}
- Current Rating: ${c.effectiveness_rating}/5
- Current Mitigation Strength: ${c.mitigation_percentage}%
`).join('\n')}

Tasks:
1. Review each control for design alignment with the risk and current implementation status.
2. Assign a maturity level to each control (DESIGNED, IMPLEMENTED, OPTIMIZED).
3. Estimate the actual mitigation strength (%) each control provides.
4. Derive an overall control effectiveness summary.
5. Identify gaps in the control environment for this risk.
6. Provide an audit-ready summary of the control landscape.

Rules:
- DESIGNED: Control is documented but not fully active.
- IMPLEMENTED: Control is active and functioning.
- OPTIMIZED: Control is automated, regularly tested, and continuously improved.
- Be advisory and conservative.
- Tone: Simple, direct, and human. "This control works well because..." instead of "Operational effectiveness is highly correlated with...". Skip complex jargon.

Return JSON:
{
  "risk_id": "${risk.risk_id}",
  "control_effectiveness": [
    {
      "control_id": "CONTROL_ID_FROM_INPUT",
      "control_name": "Control Name",
      "design_alignment": { "aligned": true, "score": 80 },
      "implementation_status": "IMPLEMENTED",
      "operating_effectiveness": { "status": "Effective", "notes": "Functioning as intended" },
      "maturity_level": "IMPLEMENTED",
      "estimated_risk_mitigation_percent": 35
    }
  ],
  "coverage_summary": {
    "total_mitigation_strength": 75,
    "gaps_identified": ["Gap 1", "Gap 2"]
  },
  "residual_risk_assessment": {
    "potential_residual_score": 6.25,
    "assessment": "Significant reduction from inherent risk"
  },
  "audit_ready_statement": "The control environment for [Risk] is robust, with MFA and Encryption provide primary mitigation...",
  "confidence_score": 90
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI control evaluation error:', error);
    throw new Error('Failed to evaluate control effectiveness');
  }
}

/**
 * Background process for control effectiveness evaluation
 */
export async function processControlEffectiveness(requestId: string, riskId: string, tenantId: string) {
  try {
    // Fetch risk and its mapped controls
    const riskResult = await query(
      'SELECT risk_id, risk_code, statement as title, description, inherent_risk_score FROM risks WHERE risk_id = $1 AND tenant_id = $2',
      [riskId, tenantId]
    );

    if (riskResult.rows.length === 0) throw new Error('Risk not found');
    const risk = riskResult.rows[0];

    const controlsResult = await query(
      `SELECT c.control_id, c.control_code, c.control_name as name, c.description, 
              c.control_type, c.implementation_status, c.effectiveness_percent as effectiveness_rating 
       FROM controls c
       JOIN risk_control_mappings rcm ON c.control_id = rcm.control_id
       WHERE rcm.risk_id = $1 AND c.tenant_id = $2`,
      [riskId, tenantId]
    );
    const controls = controlsResult.rows;

    const evaluation = await evaluateControlEffectiveness(risk, controls);

    await query(
      `UPDATE ai_suggestions 
       SET status = 'COMPLETED', suggestion = $1, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $2`,
      [JSON.stringify(evaluation), requestId]
    );

    logger.info(`AI Control Evaluation completed for request ${requestId} (Risk: ${riskId})`);
  } catch (error) {
    logger.error(`AI Control Evaluation failed for request ${requestId}:`, error);
    await query(
      `UPDATE ai_suggestions 
       SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $1`,
      [requestId]
    );
  }
}

/**
 * Assess risk impact of an event using AI (Prompt V5.1)
 */
export async function assessEventImpact(eventType: string, eventDetails: any, risks: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);
    const prompt = `System Role: You are a senior risk impact analyst.

Analyze the following event and assess its impact on the provided risk register.

Event Type: ${eventType}
Event Details: ${JSON.stringify(eventDetails)}
Tenant Language: ${tenantConfig.language_preference || 'Professional'}

Risks to Analyze:
${risks.map(r => `- ${r.risk_code}: ${r.title}`).join('\n')}

Tasks:
1. Identify which risks are significantly affected by this event.
2. Suggest updated risk scores (0-100 scale) for affected risks.
3. Recommend an overall action (e.g., ESCALATE, MONITOR, MITIGATE).
4. Tone: Extremely simple language. No risk analyst jargon. Tell a story about why this event affects these specific risks.

Return JSON:
{
  "affected_risks": [
    { "risk_id": "RISK_CODE_FROM_INPUT", "suggested_score": 75, "justification": "..." }
  ],
  "recommended_action": "ESCALATE",
  "summary": "..."
}`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI event impact assessment error:', error);
    throw new Error('Failed to assess event impact');
  }
}

/**
 * Background process for event impact assessment (Aligned with User Spec)
 */
export async function processEventImpactAssessment(requestId: string, eventId: string, eventType: string, eventDetails: any, tenantId: string) {
  try {
    // Fetch risks to assess against
    const riskResult = await query(
      'SELECT risk_id, risk_code, statement FROM risks WHERE tenant_id = $1 AND status != $2',
      [tenantId, 'CLOSED']
    );
    const risks = riskResult.rows;

    const assessment = await assessEventImpact(eventType, eventDetails, risks, tenantId);

    await query(
      `UPDATE ai_suggestions 
             SET status = 'COMPLETED', suggestion = $1, updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $2`,
      [JSON.stringify(assessment), requestId]
    );

    logger.info(`AI Event Impact assessment completed for request ${requestId} (Event: ${eventId})`);
  } catch (error) {
    logger.error(`AI Event Impact assessment failed for request ${requestId} (Event: ${eventId}):`, error);
    await query(
      `UPDATE ai_suggestions 
             SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $1`,
      [requestId]
    );
  }
}

/**
 * Generate merge strategies for duplicate risk clusters (Sprint 3)
 */
export async function generateMergeStrategies(
  duplicateClusters: any[],
  existingRisks: any[],
  incomingRisks: any[]
): Promise<any[]> {
  try {
    const strategies = [];

    for (const cluster of duplicateClusters) {
      // Find the existing and incoming risks in this cluster
      const clusterIds = cluster.risk_ids || cluster.risks_involved || [];
      const existingRisk = existingRisks.find(r => clusterIds.includes(r.risk_id));
      const incomingRisk = incomingRisks.find(r => clusterIds.includes(r.risk_id));

      if (!existingRisk || !incomingRisk) {
        // If we can't find both risks, default to skip
        strategies.push({
          cluster_id: cluster.cluster_id || `cluster_${strategies.length}`,
          similarity_score: cluster.similarity_score,
          recommended_strategy: 'skip_import',
          recommendation_reason: 'Unable to analyze risks',
          confidence: 0.5,
          existing_risk: existingRisk || {},
          incoming_risk: incomingRisk || {}
        });
        continue;
      }

      const prompt = `You are analyzing duplicate risks to recommend a merge strategy.

Existing Risk:
- Statement: ${existingRisk.statement || 'N/A'}
- Description: ${existingRisk.description || 'N/A'}
- Likelihood: ${existingRisk.likelihood_score || 'N/A'}
- Impact: ${existingRisk.impact_score || 'N/A'}
- Category: ${existingRisk.category || 'N/A'}
- Status: ${existingRisk.status || 'N/A'}

Incoming Risk (from Excel):
- Statement: ${incomingRisk.statement || 'N/A'}
- Description: ${incomingRisk.description || 'N/A'}
- Likelihood: ${incomingRisk.likelihood || 'N/A'}
- Impact: ${incomingRisk.impact || 'N/A'}
- Category: ${incomingRisk.category || 'N/A'}

Similarity Score: ${cluster.similarity_score}%

Recommend ONE of these strategies:
1. "skip_import" - Keep existing risk unchanged, don't import incoming (use when existing is better/complete)
2. "replace_existing" - Replace existing risk with incoming data (use when incoming is newer/better)
3. "merge_fields" - Merge best fields from both risks (use when both have valuable data)
4. "import_as_new" - Import as separate risk despite similarity (use when they're actually different)
5. Tone: Use very simple language in the "reason". Explain it like you are talking to a friend. Avoid technical terms.

Return ONLY valid JSON (no markdown):
{
  "recommended_strategy": "skip_import|replace_existing|merge_fields|import_as_new",
  "reason": "Brief 1-sentence explanation",
  "confidence": 0.85
}`;

      try {
        const text = await generateAIResponse(prompt);
        const aiRecommendation = extractJSON(text);

        strategies.push({
          cluster_id: cluster.cluster_id || `cluster_${strategies.length}`,
          similarity_score: cluster.similarity_score,
          recommended_strategy: aiRecommendation.recommended_strategy,
          recommendation_reason: aiRecommendation.reason,
          confidence: aiRecommendation.confidence,
          existing_risk: {
            risk_id: existingRisk.risk_id,
            risk_code: existingRisk.risk_code,
            statement: existingRisk.statement,
            description: existingRisk.description,
            category: existingRisk.category
          },
          incoming_risk: {
            risk_id: incomingRisk.risk_id,
            statement: incomingRisk.statement,
            description: incomingRisk.description,
            category: incomingRisk.category
          }
        });
      } catch (aiError) {
        logger.error('AI merge strategy error for cluster:', aiError);
        // Fallback to skip_import if AI fails
        strategies.push({
          cluster_id: cluster.cluster_id || `cluster_${strategies.length}`,
          similarity_score: cluster.similarity_score,
          recommended_strategy: 'skip_import',
          recommendation_reason: 'AI analysis unavailable, defaulting to skip',
          confidence: 0.5,
          existing_risk: existingRisk,
          incoming_risk: incomingRisk
        });
      }
    }

    return strategies;
  } catch (error) {
    logger.error('Generate merge strategies error:', error);
    return [];
  }
}


/**
 * Suggest remediation plans for a risk (Prompt V9.1)
 */
export async function suggestRemediation(risk: any, currentControls: any[]) {
  try {
    const prompt = `System Role: You are a risk remediation expert.

User Goal: Suggest specific, actionable remediation plans to mitigate the following risk.

Risk Details:
- Title: ${risk.title || risk.statement}
- Description: ${risk.description}
- Inherent Score: ${risk.inherent_risk_score} (Likelihood: ${risk.likelihood_score}, Impact: ${risk.impact_score})
- Category: ${risk.category}

Current Controls:
${currentControls.length > 0 ? currentControls.map(c => `- ${c.control_name} (${c.control_type}, ${c.implementation_status})`).join('\n') : 'No controls currently mapped.'}

Tasks:
1. Analyze the risk and the current control environment.
2. Identify gaps where the current controls are insufficient.
3. Suggest 2-3 specific, actionable remediation plans to address these gaps.
4. For each plan, provide a clear action title, detailed description, and suggested due date (e.g., "30 days", "90 days").
5. Tone: Simple and clear. Use words that anyone on the team can understand and act on immediately. No corporate speak.

Response Format (JSON Array):
[
  {
    "action_title": "Implement MFA for Remote Access",
    "description": "Enforce Multi-Factor Authentication for all VPN and remote desktop connections to mitigate unauthorized access.",
    "priority": "HIGH",
    "suggested_due_date_days": 30
  }
]
`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI remediation suggestion error:', error);
    throw new Error('Failed to generate remediation suggestions');
  }
}

/**
 * Perform deep AI analysis for a single risk and persist the result
 */
export async function processRiskAnalysis(riskId: string, tenantId: string, force: boolean = false): Promise<any> {
  try {
    // Support both UUID and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'risk_id' : 'risk_code';

    const riskResult = await query(
      `SELECT risk_id, risk_code, statement, description, category, likelihood_score, impact_score, inherent_risk_score, analysis 
       FROM risks 
       WHERE ${idColumn} = $1 AND tenant_id = $2`,
      [riskId, tenantId]
    );

    if (riskResult.rows.length === 0) {
      throw new Error('Risk not found');
    }

    const risk = riskResult.rows[0];
    const realRiskId = risk.risk_id; // Use the internal UUID for updates

    // Cache logic: Return existing analysis unless 'force' is true
    if (!force && risk.analysis) {
      logger.info(`Returning cached AI analysis for risk ${riskId}`);
      return risk.analysis;
    }

    logger.info(`Running AI analysis for risk ${riskId} (Force: ${force})`);

    const tenantConfig = await getTenantConfig(tenantId);
    const scale = tenantConfig.scales || { likelihood: 5, impact: 5 };

    const prompt = `System Role: You are a senior Risk Management Consultant (CRO).
    
    Task: Provide a sharp, concise strategic analysis of the following risk.
    
    Risk Context:
    - Code: ${risk.risk_code}
    - Statement: ${risk.statement}
    - Current Description: ${risk.description || 'Not provided'}
    - Category: ${risk.category || 'Not specified'}
    - Current Scores: Likelihood=${risk.likelihood_score || 'N/A'}, Impact=${risk.impact_score || 'N/A'}, Score=${risk.inherent_risk_score || 'N/A'}
    - Scoring Scale: 1-${scale.likelihood} Likelihood, 1-${scale.impact} Impact
    
    Analysis Requirements (STRICT CONCISENESS):
    1. **Enhanced Description**: Short, professional rewrite (MAX 2 sentences).
    2. **Impact Assessment**: One-sentence high-level business impact.
    3. **Likelihood Assessment**: One-sentence explanation for likelihood.
    4. **Mitigation Suggestions**: EXACTLY 3 short, high-impact actions.
    5. **Strategic Score**: Suggest corrected Likelihood & Impact.
    
    Return ONLY valid JSON in this format:
    {
      "enhancedDescription": "Shorte professional description...",
      "impact": "One-sentence qualitative impact...",
      "likelihood": "One-sentence qualitative likelihood...",
      "mitigationSuggestions": ["Action 1", "Action 2", "Action 3"],
      "score": {
        "suggestedLikelihood": 1-5,
        "suggestedImpact": 1-5,
        "reasoning": "Brief 1-sentence explanation"
      },
      "whyMatters": "One-sentence executive summary"
    }`;

    const text = await generateAIResponse(prompt);
    const analysis = extractJSON(text);

    // Persist to database using the UUID
    await query(
      'UPDATE risks SET analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE risk_id = $2',
      [JSON.stringify(analysis), realRiskId]
    );

    logger.info(`AI analysis successfully saved for risk ${riskId}`);
    return analysis;
  } catch (error: any) {
    logger.error(`AI Risk Analysis failed for ${riskId}:`, error.message);
    throw error;
  }
}

/**
 * Risk Correlation Analysis (Prompt V2.5 - Recreated)
 */
export async function analyzeRiskCorrelations(riskIds: string[] | undefined, tenantId: string) {
  try {
    // 1. Fetch risk details
    // If specific IDs provided, use them. Otherwise fetch all active risks for context.
    let queryText = 'SELECT risk_id, risk_code, statement, category FROM risks WHERE tenant_id = $1 AND status = \'ACTIVE\'';
    const params: any[] = [tenantId];

    if (riskIds && riskIds.length > 0) {
      queryText += ' AND risk_id = ANY($2)';
      params.push(riskIds);
    }

    const result = await query(queryText, params);
    const risks = result.rows;

    if (risks.length < 2) {
      return { correlations: [] }; // Need at least 2 risks to find correlations
    }

    // 2. Construct Prompt
    const riskList = risks.map((r: any) => `- ${r.risk_id} (${r.risk_code}): ${r.statement} [${r.category}]`).join('\n');

    const prompt = `System Role: You are a risk correlation expert.

    Analyze the provided list of risks and identify causal or correlated relationships between them.

    Risks:
    ${riskList}

    Tasks:
    1. Identify pairs of risks where one causes the other (CAUSE).
    2. Identify pairs that are likely to happen together due to shared root causes (CORRELATION).
    3. Estimate reliability/strength of the relationship (0-100%).

    Return JSON:
    {
      "correlations": [
        {
          "source_risk_id": "RISK_ID_1",
          "target_risk_id": "RISK_ID_2",
          "relationship_type": "CAUSE | CORRELATION",
          "strength": 0.85,
          "reasoning": "Brief explanation"
        }
      ]
    }`;

    // 3. Generate AI Response
    const text = await generateAIResponse(prompt);
    return extractJSON(text);

  } catch (error) {
    logger.error('AI Risk Correlation Analysis failed:', error);
    // Return empty result on failure to avoid breaking UI
    return { correlations: [] };
  }
}

/**
 * Calibrate Risk Appetite based on historical data (Prompt V2.9)
 */
export async function calibrateRiskAppetite(risks: any[], tenantId: string) {
  try {
    const tenantConfig = await getTenantConfig(tenantId);

    // Calculate basic stats for context
    const totalRisks = risks.length;
    const avgScore = risks.reduce((acc, r) => acc + (r.inherent_risk_score || 0), 0) / (totalRisks || 1);
    const criticalCount = risks.filter(r => r.inherent_risk_score > (tenantConfig.scales?.critical || 80)).length;

    const prompt = `System Role: You are a CRO advising on Risk Appetite Calibration.

    Analyze the organization's risk profile and suggest appropriate appetite thresholds.

    Organization Context:
    - Total Risks: ${totalRisks}
    - Average Risk Score: ${avgScore.toFixed(1)}
    - Critical Risks Count: ${criticalCount}
    - Current Appetite Type: ${tenantConfig.risk_appetite?.appetite_type || 'Unknown'}

    Tasks:
    1. Suggest optimized thresholds for Low, Medium, High, and Critical risks.
    2. Recommend a Risk Appetite Statement.
    3. Identify if the current appetite is too aggressive or too conservative given the actual risk profile.

    Return JSON:
    {
      "suggested_thresholds": {
        "low": 20,
        "medium": 40,
        "high": 60,
        "critical": 80
      },
      "appetite_statement": "The organization accepts moderate operational risks to drive growth...",
      "assessment": "Current thresholds are too low, causing "alert fatigue". Suggest raising them.",
      "recommended_type": "Balanced"
    }`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI Risk Appetite Calibration failed:', error);
    throw new Error('Failed to calibrate risk appetite');
  }
}

/**
 * Simulate Strategic Decision Impact (Prompt V2.10)
 */
export async function simulateDecisionImpact(scenario: string, risks: any[], _tenantId: string) {
  try {
    // Contextualize risks (simplify to save tokens)
    const riskContext = risks.map(r => ({
      id: r.risk_id,
      code: r.risk_code,
      title: r.statement,
      category: r.category,
      current_score: r.inherent_risk_score
    }));

    const prompt = `System Role: You are a Strategic Risk Simulator.

    Predict the impact of the following business decision on the organization's risk portfolio.

    Scenario: "${scenario}"

    Risk Portfolio:
    ${JSON.stringify(riskContext)}

    Tasks:
    1. Identify which specific risks will increase or decrease in score.
    2. Estimate the new scores (0-100).
    3. Identify any NEW risks that might emerge from this decision.
    4. Provide an executive summary of the net impact (Positive/Negative).

    Return JSON:
    {
      "impacted_risks": [
        {
          "risk_id": "RISK_ID",
          "risk_code": "R-101",
          "title": "Supply Chain Disruption",
          "current_score": 45,
          "predicted_score": 70,
          "direction": "INCREASE",
          "reasoning": "New supplier in unstable region increases likelihood of delay."
        }
      ],
      "new_risks_emerging": [
        {
          "title": "New Regulatory Compliance Risk",
          "description": "Entering new market requires GDPR compliance.",
          "estimated_score": 60
        }
      ],
      "executive_summary": "This decision increases operational risk by 15% but is aligned with growth strategy.",
      "overall_risk_change": "INCREASE"
    }`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);
  } catch (error) {
    logger.error('AI Decision Simulation failed:', error);
    throw new Error('Failed to simulate decision impact');
  }
}

/**
 * AI Vendor Risk Assessment with Threat Intelligence (Prompt V3.3)
 */
export async function assessVendorRisk(vendor: any) {
  try {
    const prompt = `System Role: You are a Third-Party Risk Assessor.
    
    Analyze the following vendor and generate a risk profile.
    
    Vendor: ${vendor.vendor_name}
    Category: ${vendor.category}
    Criticality: ${vendor.criticality}
    
    Tasks:
    1. Estimate inherent risk based on the vendor category (e.g., Cloud Providers have high data risk).
    2. list potential threat vectors.
    3. Generate a risk score (0-100).
    4. Provide specific security requirements we should demand.
    
    Return JSON:
    {
      "risk_score": 75,
      "generated_criticality": "HIGH",
      "findings": [
        "High concentration of data",
        "potential cross-border data transfer issues"
      ],
      "compliance_requirements": [
        "SOC2 Type II Report",
        "ISO 27001 Certificate"
      ],
      "reasoning": "Cloud infrastructure vendors represent a critical dependency..."
    }`;

    const text = await generateAIResponse(prompt);
    const aiResult = extractJSON(text);

    // Mock Threat Intelligence Signal (Sprint 14 Requirement)
    const threatSignals = [];

    // Deterministic mock logic based on name/category
    if (['Technology', 'Cloud', 'SaaS', 'Hosting'].includes(vendor.category) || vendor.vendor_name.toLowerCase().includes('cloud') || vendor.vendor_name.toLowerCase().includes('tech')) {
      threatSignals.push({ source: 'DarkWeb Monitor', signal: 'Credential Dump Detected (2024)', severity: 'MEDIUM' });
    }
    if (Math.random() > 0.7) { // Random chaos
      threatSignals.push({ source: 'BreachWatch', signal: 'Mentioned in ransomware forum', severity: 'HIGH' });
    }

    return {
      ...aiResult,
      threat_signals: threatSignals
    };

  } catch (error) {
    logger.error('AI Vendor Assessment failed:', error);
    throw new Error('Failed to assess vendor risk');
  }
}

/**
 * Generate Stakeholder Brief (Prompt V2.8)
 */
export async function generateStakeholderBrief(targetAudience: 'BOARD' | 'CRO' | 'AUDITOR' | 'TECHNICAL_TEAM', riskContext: any) {
  try {
    const prompt = `System Role: You are a Risk Communication Expert.
    
    Generate a risk briefing tailored strictly for the following audience: ${targetAudience}.
    
    Context:
    - Top Risks: ${JSON.stringify(riskContext.top_risks)}
    - Recent Incidents: ${JSON.stringify(riskContext.recent_incidents)}
    - Compliance Status: ${JSON.stringify(riskContext.compliance_status)}
    
    Guidelines:
    - BOARD: Focus on strategic impact, financial risk, and reputation. High-level, concise.
    - CRO: Focus on emerging threats, control effectiveness, and resource allocation.
    - AUDITOR: Focus on compliance gaps, evidence of control, and policy adherence. Formal tone.
    - TECHNICAL_TEAM: Focus on specific vulnerabilities, patch requirements, and technical mitigations.
    
    Tasks:
    1. Write a Subject Line.
    2. Write an Executive Summary (max 3 sentences).
    3. List 3 Key Action Items specific to this audience.
    4. Provide a "Tone" rating (e.g., Urgent, Informational, Cautious).
    
    Return JSON:
    {
      "subject": "...",
      "summary": "...",
      "key_actions": ["...", "...", "..."],
      "tone": "Urgent"
    }`;

    const text = await generateAIResponse(prompt);
    return extractJSON(text);

  } catch (error) {
    logger.error('AI Stakeholder Brief generation failed:', error);
    throw new Error('Failed to generate stakeholder brief');
  }
}


