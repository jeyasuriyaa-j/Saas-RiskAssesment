#!/bin/bash

# Configuration
API_BASE="http://localhost:9000/api/v1"
TOKEN="YOUR_AUTH_TOKEN" # Replace with valid JWT
TENANT_ID="e8773af8-3f33-4091-bac2-8e60c7fa9a70"

echo "🚀 Starting Comprehensive Smoke Tests (Sprints 4-12)..."

# S4: Import Health
echo -e "\n[S4: Import Jobs List]"
curl -s -X GET "$API_BASE/import-jobs" -H "Authorization: Bearer $TOKEN" | jq '.[0:1]'

# S5: Risk Intelligence
echo -e "\n[S5: Get Risk for AI Testing]"
RISK_ID=$(curl -s -X GET "$API_BASE/risks?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.risks[0].risk_id')
echo "Testing with Risk ID: $RISK_ID"

echo -e "\n[S5: Request Risk Improvement]"
curl -s -X POST "$API_BASE/risks/$RISK_ID/improve" -H "Authorization: Bearer $TOKEN" -d '{"prompt_id": "IMPROVE_V1"}' | jq .

# S6: Analytics
echo -e "\n[S6: Heatmap Data]"
curl -s -X GET "$API_BASE/analytics/heatmap" -H "Authorization: Bearer $TOKEN" | jq .

# S7: Governance
echo -e "\n[S7: Drift Analysis]"
curl -s -X POST "$API_BASE/governance/analysis/drift" -H "Authorization: Bearer $TOKEN" | jq .

# S8: Admin Settings
echo -e "\n[S8: Get Configuration]"
curl -s -X GET "$API_BASE/admin/config" -H "Authorization: Bearer $TOKEN" | jq .

# S9: Controls
echo -e "\n[S9: Create Control]"
CONTROL_ID=$(curl -s -X POST "$API_BASE/controls" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"control_name": "Test Control S4-12", "control_type": "PREVENTIVE"}' | jq -r '.control_id')
echo "Created Control ID: $CONTROL_ID"

# S10: Events
echo -e "\n[S10: Create Incident]"
EVENT_ID=$(curl -s -X POST "$API_BASE/events" \
  -H "Authorization: Bearer $TOKEN" -d '{"event_name": "Test Incident S4-12"}' | jq -r '.event_id')
echo "Created Event ID: $EVENT_ID"

# S11: Compliance
echo -e "\n[S11: Compliance Frameworks]"
curl -s -X GET "$API_BASE/compliance/frameworks" -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'

# S12: Reporting
echo -e "\n[S12: Executive Summary]"
curl -s -X GET "$API_BASE/reports/executive-summary" -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ Comprehensive Smoke Test Completed!"
