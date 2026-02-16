#!/bin/bash

# Configuration
API_BASE="http://localhost:9000/api/v1"
TOKEN="YOUR_AUTH_TOKEN" # Replace with a valid JWT from your login
TENANT_ID="e8773af8-3f33-4091-bac2-8e60c7fa9a70" 

echo "🚀 Starting Sprint 9-12 Smoke Tests..."

# 1. Health Check
echo -e "\n[Health Check]"
curl -s "$API_BASE/../../health" | jq .

# 2. Sprint 9: Controls
echo -e "\n[Sprint 9: Create Control]"
CONTROL_ID=$(curl -s -X POST "$API_BASE/controls" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "control_name": "MFA Enforcement",
    "description": "Ensure all users have MFA enabled",
    "control_type": "PREVENTIVE",
    "implementation_status": "IMPLEMENTED"
  }' | jq -r '.control_id')
echo "Created Control ID: $CONTROL_ID"

# 3. Sprint 10: Create Event
echo -e "\n[Sprint 10: Create Event]"
EVENT_ID=$(curl -s -X POST "$API_BASE/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "event_name": "AWS CloudFront Outage",
    "event_type": "INCIDENT",
    "severity": "HIGH"
  }' | jq -r '.event_id')
echo "Created Event ID: $EVENT_ID"

# 4. Sprint 11: Compliance Frameworks
echo -e "\n[Sprint 11: List Compliance Frameworks]"
curl -s -X GET "$API_BASE/compliance/frameworks" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'

# 5. Sprint 12: Executive Report
echo -e "\n[Sprint 12: AI Executive Summary (Storytelling)]"
curl -s -X GET "$API_BASE/reports/executive-summary" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 6. Sprint 12: Regulatory Updates
echo -e "\n[Sprint 12: AI Regulatory Tracking]"
curl -s -X GET "$API_BASE/reports/regulatory-updates" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ Smoke Tests Completed!"
