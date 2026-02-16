import { Router, Response } from 'express';
import { query } from '../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateAIResponse } from '../services/ai.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get Executive Risk Storytelling (Prompt V1.9)
 * GET /api/v1/reports/executive-summary
 */
router.get('/executive-summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenantId } = req.user!;

  // Fetch top risks and recent changes for context
  const topRisksResult = await query(
    `SELECT risk_code, statement, inherent_risk_score, priority
         FROM risks 
         WHERE tenant_id = $1 AND status != 'CLOSED'
         ORDER BY inherent_risk_score DESC
         LIMIT 5`,
    [tenantId]
  );

  const recentEventsResult = await query(
    `SELECT event_name, event_type, severity, occurred_at
         FROM events
         WHERE tenant_id = $1
         ORDER BY occurred_at DESC
         LIMIT 3`,
    [tenantId]
  );

  const prompt = `System Role: You are an executive risk advisor.
    
    Convert the following risk data into a high-level executive summary for a board-level report.
    
    Top Risks:
    ${topRisksResult.rows.map((r: any) => `- ${r.risk_code}: ${r.statement} (Score: ${r.inherent_risk_score}, Priority: ${r.priority})`).join('\n')}
    
    Recent Events/Incidents:
    ${recentEventsResult.rows.map((e: any) => `- ${e.event_name} (${e.event_type}, Severity: ${e.severity})`).join('\n')}
    
    Tasks:
    1. Summarize the current risk posture.
    2. Identify top 3 focus areas.
    3. Suggest a narrative for the board.
    
    Return JSON:
    {
      "posture_summary": "...",
      "top_focus_areas": ["...", "...", "..."],
      "executive_narrative": "...",
      "confidence_score": 90
    }`;

  const text = await generateAIResponse(prompt);
  const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
  const summary = JSON.parse(jsonString);

  res.json(summary);
}));

/**
 * Get Regulatory Change tracking (Prompt V2.6)
 * GET /api/v1/reports/regulatory-updates
 */
router.get('/regulatory-updates', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenantId } = req.user!;

  // In a real app, this would query an external regulatory API. 
  // Here we'll simulate it with AI based on the tenant's industry/region.
  const tenantResult = await query('SELECT industry, region FROM tenants WHERE tenant_id = $1', [tenantId]);
  const { industry, region } = tenantResult.rows[0];

  const prompt = `System Role: You are a regulatory compliance intelligence officer.
    
    Identify potential upcoming regulatory changes affecting a company in the ${industry || 'Technology'} industry located in ${region || 'Global'}.
    
    Tasks:
    1. List 3 potential or upcoming regulatory changes.
    2. Assess the potential impact on risk management.
    
    Return JSON:
    {
      "updates": [
        { "regulation": "...", "impact": "...", "urgency": "High|Medium|Low" }
      ],
      "overall_compliance_outlook": "..."
    }`;

  const text = await generateAIResponse(prompt);
  const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
  const updates = JSON.parse(jsonString);

  res.json(updates);
}));

/**
 * Generate Stakeholder Specific Brief (Sprint 15)
 * POST /api/v1/reports/stakeholder-brief
 */
router.post('/stakeholder-brief', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenantId } = req.user!;
  const { audience } = req.body; // BOARD, CRO, AUDITOR

  if (!audience) return res.status(400).json({ error: 'Audience is required' });

  // Gather context
  const topRisks = await query(
    'SELECT risk_code, statement, inherent_risk_score FROM risks WHERE tenant_id = $1 AND status != $2 ORDER BY inherent_risk_score DESC LIMIT 5',
    [tenantId, 'CLOSED']
  );

  const incidents = await query(
    'SELECT event_name, severity FROM events WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 3',
    [tenantId]
  );

  const { generateStakeholderBrief } = await import('../services/ai.service');

  const brief = await generateStakeholderBrief(audience, {
    top_risks: topRisks.rows,
    recent_incidents: incidents.rows,
    compliance_status: 'Active Monitoring' // Simplified for now
  });

  return res.json(brief);
}));

/**
 * Generate SOC2 Coverage Report
 * GET /api/v1/reports/soc2-coverage
 */
router.get('/soc2-coverage', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenantId } = req.user!;

  // 1. Get SOC2 Framework ID
  const fwResult = await query(
    `SELECT framework_id FROM compliance_frameworks 
     WHERE framework_name LIKE 'SOC2%' 
     AND (tenant_id = $1 OR tenant_id IS NULL)
     LIMIT 1`,
    [tenantId]
  );

  if (fwResult.rows.length === 0) {
    return res.status(404).json({ error: 'SOC2 Framework not found' });
  }

  const frameworkId = fwResult.rows[0].framework_id;

  // 2. Get all SOC2 Clauses (Criteria) and their coverage
  // A criteria is covered if it's mapped to a Risk, and that Risk has at least one active Control.
  const coverageResult = await query(
    `SELECT 
        cc.clause_number,
        cc.clause_text,
        cc.description,
        COUNT(DISTINCT r.risk_id) as mapped_risks,
        COUNT(DISTINCT c.control_id) as mapped_controls,
        (
            SELECT COUNT(*) 
            FROM evidence e 
            JOIN risk_control_mappings rcm ON e.control_id = rcm.control_id
            JOIN risk_regulation_mappings rrm ON rcm.risk_id = rrm.risk_id
            WHERE rrm.clause_id = cc.clause_id AND e.tenant_id = $1
        ) as evidence_count
     FROM compliance_clauses cc
     LEFT JOIN risk_regulation_mappings rrm ON cc.clause_id = rrm.clause_id AND rrm.tenant_id = $1
     LEFT JOIN risks r ON rrm.risk_id = r.risk_id
     LEFT JOIN risk_control_mappings rcm ON r.risk_id = rcm.risk_id
     LEFT JOIN controls c ON rcm.control_id = c.control_id
     WHERE cc.framework_id = $2
     GROUP BY cc.clause_id, cc.clause_number, cc.clause_text, cc.description
     ORDER BY cc.clause_number`,
    [tenantId, frameworkId]
  );

  // 3. Calculate summary stats
  const totalCriteria = coverageResult.rows.length;
  const coveredCriteria = coverageResult.rows.filter((row: any) => parseInt(row.mapped_controls) > 0).length;
  const withEvidence = coverageResult.rows.filter((row: any) => parseInt(row.evidence_count) > 0).length;

  return res.json({
    summary: {
      total_criteria: totalCriteria,
      covered_criteria: coveredCriteria,
      fully_auditable: withEvidence, // Has evidence
      coverage_percent: totalCriteria > 0 ? (coveredCriteria / totalCriteria) * 100 : 0
    },
    details: coverageResult.rows.map((row: any) => ({
      criteria: row.clause_number,
      description: row.clause_text,
      mapped_risks_count: parseInt(row.mapped_risks),
      mapped_controls_count: parseInt(row.mapped_controls),
      evidence_count: parseInt(row.evidence_count),
      status: parseInt(row.mapped_controls) > 0 ? (parseInt(row.evidence_count) > 0 ? 'AUDIT_READY' : 'IMPLEMENTED') : 'NOT_COVERED'
    }))
  });
}));

export default router;
