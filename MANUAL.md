# User Walkthrough: SWOT Risk Assessment

This guide walks you through the core workflow of the platform, from data ingestion to mitigation tracking.

## 1. Dashboard Overview
The Dashboard provides a 360-degree view of your risk posture:
- **Risk Heatmap**: Click on any cell (e.g., High Likelihood, High Impact) to quickly see the risks residing in that danger zone.
- **Risk Correlation Graph**: A network visualization that shows how risks depend on each other. High-density nodes indicate single points of failure.
- **Top Metrics**: Real-time counters showing total risks, mitigated risks, and critical alerts.

## 2. Smart Import (AI-Powered)
The foundation of the ERM system is the high-speed import engine:
1. Navigate to **Risks -> Import**.
2. Upload your Excel/CSV file.
3. The system will **auto-detect columns** using AI.
4. **Batch Analysis**: The AI processes rows in batches, identifying duplicate risks and suggesting better descriptions/scores.
5. Review the results in the "Staging" area before finalizing.

## 3. Risk Management
- **Detailed View**: Access a risk to see its statement, causes, and impacts.
- **AI Suggestions**: Click "Enhance" to let the AI rewrite the risk statement for better clarity or suggest mitigation controls.
- **Assignees**: Assign risks to specific users and track their acknowledgement status.

## 4. Controls & Evidence
- **Control Registry**: Maintain a list of preventive and detective controls.
- **Mapping**: Link controls to risks to see the "Residual Risk" score.
- **Evidence Upload**: Upload documents (PDF, PNG) to the "Evidence Vault" to prove control implementation for auditors.

## 5. Compliance (SOC2)
- **SOC2 Dashboard**: Track your readiness for the SOC2 Trust Services Criteria.
- **Automatic Mapping**: The AI scans your controls and maps them to relevant SOC2 criteria, highlighting coverage gaps in red.

## 6. Admin Configuration (AI Setup)
To enable AI features, an admin must configure the API key:
1. Go to **Admin Settings** (Sidebar).
2. Click the **AI Controls** tab.
3. Paste your **Gemini** or **OpenRouter API Key**.
4. Specify the **Model** (e.g., `openrouter/aurora-alpha`).
5. **Save Changes**: The system will immediately begin using these credentials for all AI-driven tasks.

---
**Tip**: Use the search bar in any list to find risks by category, owner, or status.
