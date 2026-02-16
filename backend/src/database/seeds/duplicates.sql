-- Seed duplicates for testing
INSERT INTO risks (
    tenant_id, risk_code, title, description, owner_user_id, department, status, priority, identified_date, created_by
) VALUES 
-- Exact Duplicate (same title, same owner as RISK-2026-002 - assuming owner e77900e2-7ae3-4659-9b1e-2110a980e442)
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'RISK-2026-DUP1', 'Sensitive customer data could be accessed by unauthorized personnel due to weak access controls', 'Exact duplicate for testing', 'e77900e2-7ae3-4659-9b1e-2110a980e442', 'IT Security', 'identified', 'critical', '2024-01-15', 'e77900e2-7ae3-4659-9b1e-2110a980e442'),

-- Semantic Duplicate of RISK-2026-004
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'RISK-2026-DUP2', 'Supply chain disruptions may lead to delays in component delivery', 'Semantic duplicate for testing', 'e77900e2-7ae3-4659-9b1e-2110a980e442', 'Operations', 'assessed', 'high', '2024-01-20', 'e77900e2-7ae3-4659-9b1e-2110a980e442'),

-- Semantic Duplicate of RISK-2026-006
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'RISK-2026-DUP3', 'Regulatory non-compliance with GDPR might incur heavy penalties', 'Semantic duplicate for testing', 'e77900e2-7ae3-4659-9b1e-2110a980e442', 'Legal', 'assessed', 'critical', '2024-02-01', 'e77900e2-7ae3-4659-9b1e-2110a980e442');
