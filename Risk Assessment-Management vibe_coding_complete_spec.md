# VIBE CODING – COMPLETE PRODUCT SPECIFICATION & 12-MONTH ENGINEERING ROADMAP
## All-in-One Build Document for AI Coding Agents

**Version:** 2.0  
**Date:** January 2026  
**Status:** Ready for Development  
**Audience:** Engineering teams, AI coding agents (Claude, Vibe, Codex)

---

## TABLE OF CONTENTS

1. [Product North Star](#product-north-star)
2. [Phase 1-5 Overview](#phase-overview)
3. [Complete AI Prompts (V1.1-V2.3)](#ai-prompts)
4. [API Specification](#api-specification)
5. [Database Schema](#database-schema)
6. [12-Month Sprint Roadmap](#sprint-roadmap)
7. [Market Positioning](#market-positioning)
8. [Success Metrics](#success-metrics)

---

# PRODUCT NORTH STAR

**Build an AI-powered, multi-tenant Risk Register SaaS that replaces Excel without changing how customers think about risk, while continuously adapting risks based on context, events, and regulations.**

## Core Principles

- **Risk-first** (not compliance-first)
- **Customer owns scales, language, appetite** (no forced industry models)
- **AI advises, never overrides** (explainable, auditable)
- **Everything is continuous** (event-driven, real-time updates)
- **Excel-native adoption** (< 2 weeks onboarding, no consultants)

## Global AI Rules (Apply to ALL Prompts)

```
- Never overwrite customer data automatically
- Always provide rationale and confidence score
- Respect tenant-specific configuration
- Use industry best practices only as advisory
- Do not enforce frameworks or scales
- Maintain audit-safe language
```

---

# PHASE OVERVIEW

## Phase 1 (Months 1-4): Foundation – Replace Excel
**Goal:** Get risk registers into Vibe within 30 days, no consultants.

**Features:**
- Multi-tenant SaaS core
- Excel upload with AI auto-mapping
- Flexible risk schema (customer-owned scales)
- AI risk authoring assistant (rewrite + normalize)
- Triage & heatmap (flexible)
- Audit-ready change log

**Market Position:** "Fastest Excel migration + AI-guided simplicity"

---

## Phase 2 (Months 5-8): Intelligence Layer – Make Risks Smart
**Goal:** Risk register thinks, learns, suggests.

**Features:**
- Risk memory engine (evolution tracking)
- Industry best-practice guidance (advisory only)
- Scale drift & outlier detection
- **TIER B: Control effectiveness assessment**
- **TIER B: Risk correlation & cascade analysis**
- **TIER B: Incident-to-risk learning**
- Compliance mapping (ISO, NIST, SOC2, PCI)
- Regulatory change impact assessment
- Remediation roadmap

**Market Position:** "Only tool that sees true portfolio risk and learns from incidents"

---

## Phase 3 (Months 7-8): Adaptive & Continuous Risk
**Goal:** Risks update when business changes.

**Features:**
- Event-driven risk updates (incident → auto-assess impact)
- Risk lifecycle automation
- **TIER B: Decision impact simulation** (what-if scenarios)
- Real-time vendor risk monitoring
- Stakeholder-specific communication

**Market Position:** "Risk management that predicts and prevents"

---

## Phase 4 (Months 6-8): Risk-Centric Compliance
**Goal:** Show what regulation you fail if you ignore risk.

**Features:**
- Risk → Control → Regulation mapping
- Non-compliance impact (plain language)
- Control coverage heatmaps
- SOC2/ISO automation

**Market Position:** "Compliance that's actionable, not just reported"

---

## Phase 5 (Months 9-12): Executive, Economics & Moat
**Goal:** Unlock budgets and board buy-in.

**Features:**
- Risk economics (financial impact ranges)
- Executive risk storytelling
- **TIER C: Federated industry intelligence** (privacy-safe benchmarking)
- Mobile app
- Industry-specific risk libraries

**Market Position:** "Enterprise-grade with peer benchmarking"

---

# AI PROMPTS

## PROMPT V1.1 – EXCEL MIGRATION & AUTO-MAPPING

**Purpose:** Convert messy Excel into structured risks.

**System Role:** You are an enterprise risk data normalization assistant.

**Inputs:**
- Excel column headers + sample rows
- Tenant risk schema
- Tenant terminology preferences

**Prompt:**
```
Analyze the uploaded Excel risk register.

Tasks:
1. Identify columns representing:
   - Risk description
   - Likelihood
   - Impact
   - Risk owner
   - Controls
   - Status
   - Dates
2. Map Excel fields to the tenant's risk schema.
3. Detect duplicates and inconsistent naming.
4. Flag missing or ambiguous fields.

Constraints:
- Do not modify original values.
- Suggest mappings only.
- Highlight uncertainty explicitly.

Return a mapping proposal with confidence per field.
```

**Output Schema:**
```json
{
  "mapped_fields": [
    {
      "excel_column": "Column A",
      "mapped_to_field": "risk_statement",
      "confidence": 95,
      "notes": ""
    }
  ],
  "duplicates_detected": [],
  "missing_fields": [],
  "confidence_score": 0,
  "rationale": ""
}
```

---

## PROMPT V1.2 – RISK REWRITE & NORMALIZATION

**Purpose:** Turn vague risks into structured, audit-ready statements.

**System Role:** You are an enterprise risk analyst with audit experience.

**Inputs:**
- Raw risk description
- Tenant risk language preference
- Industry context (optional)

**Prompt:**
```
Rewrite the following risk into a structured, clear, audit-ready format.

Input Risk: "{raw_risk_text}"

Rules:
- Preserve original meaning
- Do not exaggerate impact
- Use neutral, professional language
- Provide cause, event, impact structure

Also provide:
- Original vs improved comparison
- Explanation of changes
```

**Output Schema:**
```json
{
  "original_risk": "",
  "improved_risk": "",
  "cause": "",
  "event": "",
  "impact": "",
  "explanation": "",
  "confidence_score": 0
}
```

---

## PROMPT V1.3 – TRIAGE & SCORING ADVISORY

**Purpose:** Suggest risk score without overriding customer judgment.

**System Role:** You are a risk assessment advisor, not a decision-maker.

**Inputs:**
- Risk details
- Tenant scoring scale
- Risk appetite
- Industry benchmark data (optional)

**Prompt:**
```
Based on the provided risk and tenant-specific scoring model:

1. Suggest a possible likelihood and impact score.
2. Compare with industry norms (if available).
3. Highlight variance without enforcing changes.

Rules:
- Never override tenant score.
- Provide reasoning and confidence.
- Flag only material deviations.
```

**Output Schema:**
```json
{
  "suggested_likelihood": 0,
  "suggested_impact": 0,
  "industry_comparison": "",
  "variance_flag": false,
  "rationale": "",
  "confidence_score": 0
}
```

---

## PROMPT V1.4 – SCALE DRIFT & OUTLIER DETECTION

**Purpose:** Detect internal inconsistencies in scoring.

**System Role:** You are an internal risk consistency monitor.

**Inputs:**
- All tenant risks
- Historical scoring data

**Prompt:**
```
Analyze tenant risk scores to identify:
- Similar risks scored differently
- Score inflation or deflation trends
- Outliers requiring justification

Rules:
- Do not change scores.
- Provide insights only.
- Use tenant's own data as primary reference.
```

**Output Schema:**
```json
{
  "detected_outliers": [
    {
      "risk_id": "",
      "statement": "",
      "current_score": 0,
      "why_outlier": "",
      "suggested_review": true
    }
  ],
  "drift_trends": [],
  "justification_required": [],
  "explanation": ""
}
```

---

## PROMPT V1.5 – EVENT-DRIVEN RISK UPDATE

**Purpose:** Trigger reassessment when business events occur.

**System Role:** You are a continuous risk monitoring assistant.

**Inputs:**
- Event type (incident, KPI breach, vendor change)
- Affected risks
- Current risk scores

**Prompt:**
```
An event has occurred: "{event_type}"

Assess whether this event:
- Increases likelihood
- Increases impact
- Requires review

Rules:
- Do not auto-update scores.
- Recommend actions only.
- Cite which part of the risk is affected.
```

**Output Schema:**
```json
{
  "affected_risks": [],
  "recommended_action": "Review | Escalate | No action",
  "rationale": "",
  "urgency_level": "Low | Medium | High"
}
```

---

## PROMPT V1.6 – RISK LIFECYCLE & ZOMBIE DETECTION

**Purpose:** Detect stale or unmanaged risks.

**System Role:** You are a risk lifecycle governance assistant.

**Inputs:**
- Risk last updated date
- Owner activity
- Review frequency

**Prompt:**
```
Identify risks that show signs of decay:
- No updates beyond review cycle
- Ownership inactivity
- Repeated acceptance without mitigation

Recommend next steps without enforcing closure.
```

**Output Schema:**
```json
{
  "zombie_risks": [],
  "decay_reason": "",
  "recommended_next_step": ""
}
```

---

## PROMPT V1.7 – RISK → CONTROL → REGULATION MAPPING

**Purpose:** Map risks to compliance exposure.

**System Role:** You are a compliance-aware risk mapping assistant.

**Inputs:**
- Risk description
- Existing controls
- Enabled frameworks (ISO, NIST, SOC2, PCI)

**Prompt:**
```
For the given risk, suggest:
1. Relevant controls that mitigate it
2. Applicable regulatory clauses

Rules:
- Suggest only, never enforce
- Provide clause references
- Explain why each mapping applies
```

**Output Schema:**
```json
{
  "mapped_controls": [],
  "mapped_regulations": [
    {
      "framework": "ISO 27001",
      "clause": "A.9.4.3",
      "applicability": "HIGH"
    }
  ],
  "non_compliance_risk": "",
  "rationale": "",
  "confidence_score": 0
}
```

---

## PROMPT V1.8 – NON-COMPLIANCE IMPACT EXPLANATION

**Purpose:** Explain regulatory exposure in plain language.

**System Role:** You are an audit communication assistant.

**Inputs:**
- Risk
- Mapped regulations

**Prompt:**
```
Explain the compliance impact if this risk is not mitigated.

Rules:
- Use non-alarmist language
- Avoid legal conclusions
- Focus on potential exposure
```

**Output Schema:**
```json
{
  "impact_summary": "",
  "affected_frameworks": [],
  "audit_ready_statement": ""
}
```

---

## PROMPT V1.9 – EXECUTIVE RISK STORYTELLING

**Purpose:** Convert risk data into board-level insight.

**System Role:** You are an executive risk advisor.

**Inputs:**
- Top risks
- Recent changes
- Key events

**Prompt:**
```
Summarize enterprise risk posture for executives:
- What changed
- Why it matters
- What decisions are required

Rules:
- No jargon
- Action-oriented
- Strategic tone
```

**Output Schema:**
```json
{
  "executive_summary": "",
  "key_changes": [],
  "decisions_required": []
}
```

---

## PROMPT V1.10 – RISK ECONOMICS & COST IMPACT

**Purpose:** Translate risk into financial language.

**System Role:** You are a risk quantification advisor.

**Inputs:**
- Risk severity
- Incident history
- Business context

**Prompt:**
```
Estimate potential financial impact ranges.

Rules:
- Use ranges, not point values
- Clearly state assumptions
- Do not present as exact figures
```

**Output Schema:**
```json
{
  "financial_impact_range": "$100K-$500K",
  "assumptions": [],
  "confidence_level": "Medium"
}
```

---

## PROMPT V2.1 – DATA QUALITY & VALIDATION

**Purpose:** Pre-flight validation before mapping or import.

**System Role:** You are a data quality gatekeeper.

**Inputs:**
- Raw Excel/CSV data (headers + rows)
- Tenant data dictionary
- Field requirements

**Prompt:**
```
Analyze dataset for quality before mapping or import.

Tasks:
1. Detect structural issues (missing headers, encoding problems)
2. Validate data types (numeric vs text mismatches)
3. Check completeness (required fields blank)
4. Validate against tenant config (allowed values, ranges)
5. Identify anomalies (outliers, malformed dates)
6. Summarize import safety

Do not modify data. Only classify issues and recommend remediation.
```

**Output Schema:**
```json
{
  "data_quality_score": 0,
  "assessment_summary": "",
  "blocking_issues": [
    {
      "issue": "",
      "severity": "BLOCKING",
      "affected_rows": [],
      "remediation": ""
    }
  ],
  "warnings": [],
  "field_completeness": {},
  "safe_to_proceed": false,
  "remediation_steps": [],
  "confidence_score": 0,
  "rationale": ""
}
```

---

## PROMPT V2.2 – RISK DEDUPLICATION & CONSOLIDATION

**Purpose:** Detect duplicate risks and propose consolidation.

**System Role:** You are a risk consolidation advisor.

**Inputs:**
- List of risks (IDs, statements, owners, controls)
- Tenant ownership structure
- (Optional) Similarity thresholds

**Prompt:**
```
Analyze risks to detect duplicates and near-duplicates.

Tasks:
1. Identify exact duplicates (same statement, owner)
2. Detect semantic duplicates (same cause/impact, different wording)
3. Form duplicate clusters
4. Analyze ownership implications
5. Recommend consolidation strategy per cluster

Do not merge; suggestions only. Be conservative.
```

**Output Schema:**
```json
{
  "duplicate_clusters": [
    {
      "cluster_id": "",
      "cluster_type": "exact_duplicate | semantic_duplicate | uncertain",
      "risks_involved": [],
      "consolidation_recommendation": "CONSOLIDATE | KEEP_SEPARATE | FLAG_FOR_REVIEW",
      "merge_strategy": {
        "primary_risk_id": "",
        "suggested_merged_statement": "",
        "suggested_owner": ""
      },
      "control_overlap": {},
      "confidence_score": 0,
      "rationale": ""
    }
  ],
  "consolidation_summary": {}
}
```

---

## PROMPT V2.3 – CONTROL EFFECTIVENESS & RESIDUAL RISK

**Purpose:** Assess whether controls actually mitigate risks.

**System Role:** You are a control effectiveness auditor.

**Inputs:**
- Risk description
- Mapped controls
- Implementation status
- Testing history
- Related incidents

**Prompt:**
```
Evaluate control effectiveness for this risk.

Tasks:
1. Review each control: design alignment, implementation, testing
2. Assign maturity level (DESIGNED, IMPLEMENTED, OPTIMIZED)
3. Estimate mitigation strength (%)
4. Derive overall effectiveness
5. Identify gaps and weaknesses
6. Provide audit-ready summary

Do not change scores; advisory only.
```

**Output Schema:**
```json
{
  "risk_id": "",
  "control_effectiveness": [
    {
      "control_id": "",
      "control_name": "",
      "design_alignment": { "aligned": true, "score": 0 },
      "implementation_status": "DESIGNED | IMPLEMENTED | OPTIMIZED",
      "operating_effectiveness": {},
      "maturity_level": "DESIGNED | IMPLEMENTED | OPTIMIZED",
      "estimated_risk_mitigation_percent": 0
    }
  ],
  "coverage_summary": {},
  "residual_risk_assessment": {},
  "audit_ready_statement": "",
  "confidence_score": 0
}
```

---

# API SPECIFICATION

## Base URL
```
https://api.vibecoding.com/api/v1
```

## Authentication
```
Authorization: Bearer {JWT_TOKEN}
```

## Multi-Tenancy
All requests include implicit tenant context from JWT. All responses tenant-isolated.

---

## Risk CRUD Endpoints

### Create Risk
```
POST /risks

Request:
{
  "statement": "Database encryption insufficient",
  "category": "Technology",
  "owner_id": "user123",
  "causes": ["Legacy systems lack encryption"],
  "impacts": ["Data breach risk"],
  "status": "ACTIVE",
  "review_cycle_days": 90,
  "custom_fields": { "business_unit": "Engineering" }
}

Response (201):
{
  "risk_id": "R45",
  "created_at": "2026-01-21T08:00:00Z",
  "status": "DRAFT",
  "audit_entry_id": "LOG_001"
}
```

### Read Risk
```
GET /risks/{riskId}

Response (200):
{
  "risk_id": "R45",
  "statement": "...",
  "scores": {
    "likelihood": 75,
    "impact": 80,
    "calculated_risk_score": 77
  },
  "controls": [{ "control_id": "C120", "effectiveness": 70 }],
  "compliance_mappings": [{ "framework": "ISO 27001", "clause": "A.9.4.3" }],
  "audit_trail": [...]
}
```

### Update Risk
```
PUT /risks/{riskId}

Request:
{
  "likelihood_score": 75,
  "impact_score": 80,
  "status": "ACTIVE",
  "comment": "Updated based on incident INC_001"
}

Response (200):
{
  "risk_id": "R45",
  "updated_at": "2026-01-21T09:00:00Z",
  "changes_tracked": {...}
}
```

### Delete Risk (Soft)
```
DELETE /risks/{riskId}

Response (204 No Content)
```

### List Risks with Filtering
```
GET /risks?status=ACTIVE&owner_id=user123&min_score=60&sort_by=risk_score&page=1&limit=50

Response (200):
{
  "page": 1,
  "limit": 50,
  "total": 147,
  "risks": [...]
}
```

---

## AI Suggestion Endpoints

### Request Risk Improvement
```
POST /risks/{riskId}/suggest-improvement

Request:
{
  "prompt_id": "PROMPT_2",
  "raw_statement": "Database encryption controls are insufficient"
}

Response (202 Accepted):
{
  "request_id": "REQ_12345",
  "status": "PROCESSING"
}

GET /risks/{riskId}/suggestions/{requestId}

Response (200):
{
  "request_id": "REQ_12345",
  "status": "COMPLETED",
  "suggestion": {
    "original_risk": "...",
    "improved_risk": "...",
    "confidence_score": 87
  },
  "user_action": "PENDING"
}
```

### Request Risk Score
```
POST /risks/{riskId}/suggest-score

Request:
{
  "prompt_id": "PROMPT_3",
  "use_industry_benchmarks": true
}

Response (202): { "request_id": "REQ_12346" }

GET /risks/{riskId}/score-suggestions/{requestId}

Response (200):
{
  "suggestion": {
    "suggested_likelihood": 75,
    "suggested_impact": 80,
    "confidence_score": 85,
    "rationale": "..."
  }
}
```

### Request Event Impact Assessment
```
POST /events/{eventId}/assess-risk-impact

Request:
{
  "prompt_id": "PROMPT_5",
  "event_type": "INCIDENT",
  "event_details": { "description": "Database exposed" }
}

Response (202): { "request_id": "REQ_12348" }

GET /events/{eventId}/risk-assessments/{requestId}

Response (200):
{
  "affected_risks": [{ "risk_id": "R45", "suggested_score": 75 }],
  "recommended_action": "ESCALATE"
}
```

---

## Bulk Operations

### Bulk Import
```
POST /risks/bulk-import

Form Data:
- file: risks.xlsx
- validation_level: STRICT | PERMISSIVE
- preview_only: false

Response (202):
{
  "import_job_id": "IMPORT_JOB_001",
  "status": "PROCESSING"
}

GET /import-jobs/{importJobId}

Response (200):
{
  "status": "COMPLETED",
  "summary": {
    "total_rows": 150,
    "imported": 150,
    "created_risks": 145
  }
}
```

---

## Audit Trail

### Get Risk Audit Trail
```
GET /risks/{riskId}/audit-trail?limit=50&sort_order=DESC

Response (200):
{
  "risk_id": "R45",
  "audit_entries": [
    {
      "entry_id": "LOG_98765",
      "timestamp": "2026-01-21T09:00:00Z",
      "action": "UPDATED",
      "actor_id": "user123",
      "changes": { "likelihood_score": { "old": null, "new": 75 } }
    }
  ]
}
```

---

## Admin Configuration

### Get Tenant Config
```
GET /admin/tenants/{tenantId}/config

Response (200):
{
  "tenant_id": "acme-corp",
  "risk_model": { "custom_fields": [...], "categories": [...] },
  "scoring_configuration": {
    "likelihood_scale": { "min": 1, "max": 100 },
    "risk_calculation_logic": "AVERAGE"
  },
  "risk_appetite": {
    "acceptable_threshold": 60,
    "escalation_threshold": 75,
    "statement": "Moderate risk appetite"
  },
  "ai_controls": {
    "enabled_prompts": ["PROMPT_1", "PROMPT_2", ...],
    "confidence_threshold": 90
  }
}
```

### Update Tenant Config
```
PUT /admin/tenants/{tenantId}/config

Request:
{
  "risk_appetite": {
    "acceptable_threshold": 65,
    "escalation_threshold": 80
  }
}

Response (200): { "config_updated": true }
```

---

# DATABASE SCHEMA

## Core Tables

### Tenants
```sql
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  subscription_tier ENUM('free', 'growth', 'enterprise'),
  risk_model_config JSONB,
  scoring_config JSONB,
  risk_appetite_config JSONB,
  ai_config JSONB,
  governance_config JSONB,
  compliance_config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Risks
```sql
CREATE TABLE risks (
  risk_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  statement TEXT NOT NULL,
  category VARCHAR(100),
  owner_user_id UUID NOT NULL,
  causes JSONB,
  impacts JSONB,
  status ENUM('DRAFT', 'ACTIVE', 'MITIGATED', 'CLOSED', 'DELETED') DEFAULT 'DRAFT',
  likelihood_score INT,
  impact_score INT,
  custom_score INT,
  residual_risk_percent INT,
  review_cycle_days INT DEFAULT 90,
  last_reviewed_at TIMESTAMP,
  next_review_due_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_fields JSONB,
  
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_owner (tenant_id, owner_user_id),
  INDEX idx_next_review (tenant_id, next_review_due_at)
);
```

### Controls
```sql
CREATE TABLE controls (
  control_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  control_name VARCHAR(255) NOT NULL,
  description TEXT,
  control_type ENUM('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'),
  implementation_status ENUM('DESIGNED', 'IMPLEMENTED', 'OPTIMIZED'),
  implementation_percent INT,
  last_tested_at TIMESTAMP,
  test_results ENUM('PASSED', 'FAILED', 'PARTIAL'),
  effectiveness_percent INT,
  owner_user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (tenant_id, implementation_status)
);
```

### Risk-Control Mappings
```sql
CREATE TABLE risk_control_mappings (
  mapping_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  risk_id UUID NOT NULL REFERENCES risks(risk_id),
  control_id UUID NOT NULL REFERENCES controls(control_id),
  mitigation_strength ENUM('STRONG', 'MODERATE', 'WEAK'),
  controls_what_percent INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(risk_id, control_id),
  INDEX idx_risk (risk_id),
  INDEX idx_control (control_id)
);
```

### Compliance Frameworks & Mappings
```sql
CREATE TABLE compliance_frameworks (
  framework_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  framework_name VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, framework_name)
);

CREATE TABLE compliance_clauses (
  clause_id UUID PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(framework_id),
  clause_number VARCHAR(20),
  clause_text TEXT,
  description TEXT
);

CREATE TABLE risk_regulation_mappings (
  mapping_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  risk_id UUID NOT NULL REFERENCES risks(risk_id),
  clause_id UUID NOT NULL REFERENCES compliance_clauses(clause_id),
  exposure_level ENUM('HIGH', 'MEDIUM', 'LOW'),
  mapped_by ENUM('AI', 'MANUAL'),
  confidence_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(risk_id, clause_id)
);
```

### AI Suggestions & Audit
```sql
CREATE TABLE ai_suggestions (
  suggestion_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  risk_id UUID REFERENCES risks(risk_id),
  prompt_id VARCHAR(50),
  prompt_version VARCHAR(10),
  suggestion_type VARCHAR(50),
  ai_output JSONB,
  confidence_score INT,
  model_used VARCHAR(100),
  user_action ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED'),
  feedback_rating INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tenant (tenant_id),
  INDEX idx_risk (risk_id),
  INDEX idx_status (user_action)
);

CREATE TABLE audit_log (
  log_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  entity_type ENUM('RISK', 'CONTROL', 'MAPPING', 'CONFIG'),
  entity_id UUID,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'ACCEPT', 'REJECT'),
  changes JSONB,
  actor_user_id UUID NOT NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  immutable BOOLEAN DEFAULT true,
  
  INDEX idx_tenant_timestamp (tenant_id, timestamp DESC),
  INDEX idx_entity (entity_type, entity_id)
);

CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  event_type ENUM('INCIDENT', 'KPI_BREACH', 'VENDOR_CHANGE', 'POLICY_CHANGE'),
  event_name VARCHAR(255),
  description TEXT,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  occurred_at TIMESTAMP,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  affected_risk_ids UUID[],
  ai_assessment_completed BOOLEAN DEFAULT false,
  created_by_user_id UUID,
  
  INDEX idx_tenant (tenant_id),
  INDEX idx_occurred_at (occurred_at)
);
```

---

# SPRINT ROADMAP (12 MONTHS)

## MONTH 1-2: Foundation (Sprints 1-4)

### Sprint 1: Core SaaS Architecture (Weeks 1-2)
**Deliverables:**
- Multi-tenant backend (Node.js + PostgreSQL)
- Risk CRUD API
- Basic audit logging
- Simple login + risk list UI
- Deploy to Replit/AWS

**Tech Stack:**
- Backend: Node.js + Express
- Frontend: Next.js + React
- Database: PostgreSQL 14+
- Hosting: Replit or AWS Elastic Beanstalk
- Auth: Clerk or Auth0

**Effort:** ~140 hours (2 engineers, 1.5 weeks actual work)

**Acceptance Criteria:**
- ✅ Create/read/update/delete risks via API
- ✅ Audit entries created for every change
- ✅ Multi-tenant isolation enforced
- ✅ Deployable to production

---

### Sprint 2: Data Validation & Import (Weeks 3-4)
**Features:**
- Prompt V2.1 (Data Quality & Validation)
- File upload endpoint
- Excel/CSV parser
- Data quality report UI
- Import staging table

**Effort:** ~210 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ Can upload Excel file
- ✅ Data quality score + issues returned
- ✅ No data imported yet (validation only)
- ✅ Remediation steps suggested

---

### Sprint 3: Field Mapping & Dedup (Weeks 5-6)
**Features:**
- Prompt V1.1 (Excel Mapping)
- Prompt V2.2 (Risk Deduplication)
- Mapping suggestion UI
- Duplicate clustering UI

**Effort:** ~220 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ AI suggests field mappings
- ✅ User can approve/override mappings
- ✅ Duplicates detected + clustered
- ✅ Merge strategy recommendations shown

---

### Sprint 4: Risk Import & Audit (Weeks 7-8)
**Features:**
- Risk creation from approved mapping
- Deduplication logic
- Before/after comparison UI
- Detailed audit logging

**Effort:** ~100 hours (1.5 weeks)

**Acceptance Criteria:**
- ✅ Excel import completes without data loss
- ✅ Every import action audited
- ✅ Before/after comparison visible
- ✅ Can export audit trail

**Phase 1 Core Ready:** Users can migrate Excel → Vibe in < 2 weeks

---

## MONTH 3: Risk Intelligence (Sprints 5-6)

### Sprint 5: Risk Improvement & Scoring (Weeks 9-10)
**Features:**
- Prompt V1.2 (Risk Rewriting)
- Prompt V1.3 (Scoring Advisory)
- Risk detail page with AI features
- Side-by-side improvement comparison
- Suggestion storage + user actions logged

**Effort:** ~210 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ Can request risk rewriting
- ✅ Can request score suggestions
- ✅ Suggestions logged for feedback
- ✅ User can accept/reject/edit

---

### Sprint 6: Heatmap Visualization (Weeks 11-12)
**Features:**
- Heatmap data endpoint
- 2D grid visualization (likelihood vs impact)
- Risk appetite zones (green/yellow/red)
- Click cells to list risks
- Mobile responsive

**Effort:** ~110 hours (1.5 weeks)

**Acceptance Criteria:**
- ✅ Heatmap renders correctly
- ✅ Risk appetite zones visible
- ✅ Click to drill-in
- ✅ Mobile responsive

**Phase 1 Intelligence Added:** Risk management feels intelligent, not just storage

---

## MONTH 4: Governance (Sprints 7-8)

### Sprint 7: Scale Drift Detection (Weeks 13-14)
**Features:**
- Prompt V1.4 (Scale Drift & Outlier Detection)
- Drift analysis endpoint
- Outlier flagging UI
- Risk comparison views

**Effort:** ~160 hours (2 weeks)

**Acceptance Criteria:**
- ✅ Scoring inconsistencies detected
- ✅ Outliers flagged with explanations
- ✅ Can request justifications
- ✅ Results logged for audit

---

### Sprint 8: Admin Settings (Weeks 15-16)
**Features:**
- Risk model configuration
- Scoring scale customization
- Risk appetite thresholds
- AI controls (enable/disable prompts)
- Governance rules

**Effort:** ~200 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ Admin can configure risk model
- ✅ Configuration persists
- ✅ System uses configured scales
- ✅ Changes logged to audit trail

**Phase 1 Complete & Market-Ready:**
- ✅ Excel import working
- ✅ AI suggestions + scoring
- ✅ Heatmap visualization
- ✅ Governance controls
- **10+ beta customers**
- **Target: $20K-30K MRR**

---

## MONTH 5: Tier B Features (Sprints 9-10)

### Sprint 9: Control Effectiveness & Remediation (Weeks 17-18)
**Features:**
- Control CRUD API
- Risk-control mapping
- Prompt V2.3 (Control Effectiveness)
- Prompt V2.7 (Remediation Roadmap)
- Controls UI in risk detail

**Effort:** ~280 hours (3.5 weeks)

**Acceptance Criteria:**
- ✅ Can create controls & map to risks
- ✅ AI assesses effectiveness
- ✅ Remediation actions suggested
- ✅ Actions exportable

**Differentiator:** Only Vibe has AI-assessed control effectiveness

---

### Sprint 10: Risk Correlation & Incidents (Weeks 19-20)
**Features:**
- Events API
- Prompt V2.5 (Risk Correlation Analysis)
- Prompt V2.4 (Incident-to-Risk Learning)
- Correlation network visualization
- Incident impact assessment UI

**Effort:** ~320 hours (4 weeks)

**Acceptance Criteria:**
- ✅ Can log incidents
- ✅ AI suggests which risks affected
- ✅ Correlations visualized
- ✅ Portfolio concentration metrics shown

**Differentiator:** ONLY tool showing risk correlations + cascades

---

## MONTH 6: Compliance (Sprints 11-12)

### Sprint 11: Compliance Mapping (Weeks 21-22)
**Features:**
- Compliance framework management
- Prompt V1.7 (Risk-Control-Regulation Mapping)
- Prompt V1.8 (Non-Compliance Impact)
- Compliance dashboard
- Framework-specific risk views

**Effort:** ~220 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ Frameworks enabled/disabled
- ✅ Risks mapped to clauses
- ✅ Exposure levels shown
- ✅ Non-compliance impact clear

---

### Sprint 12: Regulatory Updates & Executive Reports (Weeks 23-24)
**Features:**
- Regulatory change tracking
- Prompt V2.6 (Regulatory Change Impact)
- Prompt V1.9 (Executive Storytelling)
- Executive dashboard + board deck export

**Effort:** ~220 hours (2.5 weeks)

**Acceptance Criteria:**
- ✅ Can log new regulations
- ✅ Impact auto-assessed
- ✅ Executive summary generated
- ✅ Board deck exportable

**Phase 2 Complete & Market-Ready:**
- ✅ Control effectiveness assessment
- ✅ Risk correlations visualized
- ✅ Incident-to-risk learning
- ✅ Compliance automation
- ✅ Executive reporting
- **20+ paying customers**
- **Target: $50K MRR**

---

## MONTH 7-8: Advanced Features (Sprints 13-16)

### Sprint 13: Risk Appetite & Decision Simulation (Weeks 25-26)
**Features:**
- Prompt V2.9 (Risk Appetite Calibration)
- Prompt V2.10 (Decision Impact Simulator)
- Scenario planning UI
- Impact modeling

**Differentiator:** ONLY tool showing decision impact on portfolio

**Effort:** ~230 hours (3 weeks)

---

### Sprint 14: Vendor Risk Automation (Weeks 27-28)
**Features:**
- Vendor management API
- Threat intelligence integration (Have I Been Pwned, Shodan)
- Vendor health dashboard
- Auto-incident creation for breaches

**Effort:** ~180 hours (2.5 weeks)

---

### Sprint 15: Stakeholder Communication (Weeks 29-30)
**Features:**
- Prompt V2.8 (Stakeholder Communication)
- Role-based dashboards (Risk Owner, CRO, Auditor, Board)
- PDF export for board presentations

**Effort:** ~210 hours (3 weeks)

---

### Sprint 16: Testing & Hardening (Weeks 31-32)
**Features:**
- Unit + integration testing (70% coverage)
- Performance testing (load test, large portfolios)
- Security audit
- Accessibility compliance (WCAG 2.1 AA)

**Effort:** ~300 hours (4 weeks)

---

## MONTH 9-12: Scale & Moat (Sprints 17-20)

### Sprint 17: Mobile App (Weeks 33-34)
**Features:**
- React Native or responsive web mobile UI
- Risk list, detail, incident reporting
- Push notifications

**Effort:** ~250 hours (3 weeks)

---

### Sprint 18: Industry Intelligence (Weeks 35-36)
**Features:**
- Federated learning framework
- Industry risk library
- Peer comparison dashboard

**Effort:** ~330 hours (4 weeks)

---

### Sprint 19: Advanced Compliance (Weeks 37-38)
**Features:**
- SOC2 module
- Automated compliance reports
- Evidence management

**Effort:** ~200 hours (3 weeks)

---

### Sprint 20: Launch Polish & Optimization (Weeks 39-40)
**Features:**
- Performance optimization
- Scaling for 10K+ risks
- Documentation + videos
- Launch checklist

**Effort:** ~250 hours (3 weeks)

---

## Timeline Summary

| Month | Phase | Focus | Deliverable |
|-------|-------|-------|-------------|
| 1-2 | Phase 1 Foundation | Excel import + CRUD | Core product |
| 3 | Phase 1 Intelligence | Risk improvement + scoring | Smart risks |
| 4 | Phase 1 Governance | Drift + admin settings | Governance |
| 5 | Phase 2 Part A | Controls + correlations | Differentiation |
| 6 | Phase 2 Part B | Compliance + regulatory | Audit-ready |
| 7-8 | Phase 2.5 | Appetite + decision sim + vendor risk | Advanced |
| 9-12 | Phase 3+ | Mobile + industry intelligence + scale | Enterprise |

---

# MARKET POSITIONING

## Competitive Landscape

| Feature | Archer | LogicGate | Sprinto | **Vibe** |
|---------|--------|-----------|---------|---------|
| **Implementation Time** | 6-12 months | 3-6 months | 2-4 months | **< 2 weeks** |
| **Price** | $50K-500K+/year | $30K-300K+/year | $20K-200K+/year | **$500-5K/mo** |
| **UX/Adoption Friction** | High (legacy) | Medium | Low (SaaS) | **Very Low (Excel-first)** |
| **AI-Guided Scoring** | None | Limited | Limited | **Full** |
| **Risk Correlations** | None | None | None | **Yes** |
| **Decision Simulation** | None | None | None | **Yes** |
| **Vendor Risk** | Expensive add-on | Expensive add-on | Included | **Integrated** |
| **Federated Benchmarks** | None | None | By industry | **Privacy-safe** |

## Go-to-Market Narrative

### For SMBs
**Pain:** Can't afford Archer, too much process, want simple risk tracking.  
**Vibe Pitch:** "Replace Excel risk register with an AI assistant that gets smarter as you use it. $500/month, zero setup."  
**Proof:** 30-day trial → migrate 10 risks + AI suggestions + correlations visible.

### For Fast-Growing Companies
**Pain:** Risk doesn't scale with company; need governance but hate bureaucracy.  
**Vibe Pitch:** "Risk register that grows with you. AI catches inconsistencies. Audit-ready from day 1. Phase 2 in month 2."  
**Proof:** Onboard < 2 weeks. Incident-to-risk learning working. NPS > 40 on beta.

### For GRC/Compliance Teams
**Pain:** Audit findings on consistency; regulatory changes hard to track.  
**Vibe Pitch:** "AI-assisted risk management with built-in audit evidence. Regulatory updates auto-assessed. Every decision explained."  
**Proof:** Risk decisions logged + rationale. Incident-to-risk learning = continuous improvement. Control effectiveness assessed.

### For Enterprise (Archer/LogicGate Users)
**Pain:** Legacy platform slow; staff doesn't adopt it; customization expensive.  
**Vibe Pitch:** "Modern alternative to Archer. Faster, cheaper, AI-guided. Risk correlation + decision simulation that Archer doesn't have. Export anytime (no lock-in)."  
**Proof:** Real-time correlation analysis; industry benchmarking; 10x cheaper.

---

# SUCCESS METRICS

## By Month 4 (Phase 1 Launch)
- ✅ Excel import time: < 2 hours for 100 risks (vs 3-5 days manual)
- ✅ Data loss: 0%
- ✅ Beta customers: 10+
- ✅ User adoption rate: 70%+
- ✅ API uptime: > 99%
- ✅ Customer NPS: > 30

## By Month 8 (Phase 2 Launch)
- ✅ Correlation analysis: detects 80%+ of correlated risk pairs
- ✅ Incident response time: < 1 hour (vs 1 week manual)
- ✅ Compliance mapping accuracy: 90%+
- ✅ Paying customers: 20+
- ✅ Monthly recurring revenue: $20K-50K
- ✅ Customer NPS: > 45
- ✅ Churn rate: < 15%

## By Month 12 (Scaling)
- ✅ Paying customers: 50+
- ✅ Monthly recurring revenue: $50K+
- ✅ Enterprise customers (5K+ risks): 5+
- ✅ Product-market fit signals: NPS > 50, < 10% churn
- ✅ Unique features no competitor has: 3+ (correlations, decision sim, federated intelligence)
- ✅ Series A funding ready

---

# RESOURCE PLAN

## Team Composition

| Role | Months 1-4 | Months 5-8 | Months 9-12 |
|------|-----------|-----------|-----------|
| Backend Engineers | 2 FTE | 2.5 FTE | 2 FTE |
| Frontend Engineers | 1 FTE | 2 FTE | 2 FTE |
| AI/ML Engineer | 0.5 FTE | 1.5 FTE | 1 FTE |
| QA/Testing | 0.5 FTE | 1 FTE | 1.5 FTE |
| DevOps/Infra | 0.25 FTE | 0.5 FTE | 0.5 FTE |
| Product Manager | 1 FTE | 1 FTE | 1 FTE |
| **TOTAL** | **5.25 FTE** | **8 FTE** | **8 FTE** |

## Cost Estimate ($150K loaded per FTE annually)

- Months 1-4: $65K
- Months 5-8: $100K
- Months 9-12: $100K
- **Subtotal: $265K**
- Infrastructure: $8K
- LLM APIs: $4K
- Tools/Services: $2.4K
- **TOTAL: ~$280K for 12 months**

---

# LAUNCH READINESS CHECKLIST

## Month 4 (Phase 1)
- [ ] Core features complete
- [ ] 10+ beta customers
- [ ] No critical bugs
- [ ] Documentation done
- [ ] Pricing model finalized
- [ ] Sales/marketing ready

## Month 8 (Phase 2)
- [ ] Tier B features complete
- [ ] 20+ paying customers
- [ ] NPS > 40
- [ ] Case study complete
- [ ] Competitive positioning refined

## Month 12 (Scaling)
- [ ] Mobile app live
- [ ] Industry intelligence beta
- [ ] 50+ customers
- [ ] $50K+ MRR
- [ ] Series A funding ready

---

# SUMMARY

**Vibe Coding is positioned to dominate SMB + fast-growth market** by being:
- 10x faster to value (< 2 weeks vs 6-12 months)
- 10x cheaper ($500/mo vs $50K/yr)
- 10x smarter (AI-guided, correlations, decision simulation)
- 10x more adoptable (Excel-first, not web-forced)

**Build this roadmap, execute on Tier A + B features, and you have a $50M+ business within 2 years.**

---

**END OF DOCUMENT**

