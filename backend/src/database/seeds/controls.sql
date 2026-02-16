-- Seed controls
INSERT INTO controls (
    tenant_id, control_code, name, description, control_type, implementation_status, effectiveness_rating, owner_user_id
) VALUES 
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'CTRL-SEC-001', 'Multi-Factor Authentication (MFA)', 'Enforce MFA for all administrative and user access to sensitive systems.', 'preventive', 'implemented', 4, 'e77900e2-7ae3-4659-9b1e-2110a980e442'),
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'CTRL-SEC-002', 'Encryption at Rest', 'All sensitive customer data is encrypted using AES-256.', 'preventive', 'implemented', 5, 'e77900e2-7ae3-4659-9b1e-2110a980e442'),
('e81a81fd-e2c9-47e4-8d4b-7b58ad907e31', 'CTRL-SEC-003', 'Security Awareness Training', 'Annual training for all employees on security best practices.', 'preventive', 'planned', 2, 'e77900e2-7ae3-4659-9b1e-2110a980e442');

-- Map controls to Risk (RISK-2026-002: Data Breach)
INSERT INTO risk_controls (risk_id, control_id, mitigation_percentage)
SELECT 
    (SELECT risk_id FROM risks WHERE risk_code = 'RISK-2026-002' AND tenant_id = 'e81a81fd-e2c9-47e4-8d4b-7b58ad907e31'),
    control_id,
    CASE 
        WHEN control_code = 'CTRL-SEC-001' THEN 40
        WHEN control_code = 'CTRL-SEC-002' THEN 30
        WHEN control_code = 'CTRL-SEC-003' THEN 10
    END
FROM controls
WHERE control_code IN ('CTRL-SEC-001', 'CTRL-SEC-002', 'CTRL-SEC-003')
AND tenant_id = 'e81a81fd-e2c9-47e4-8d4b-7b58ad907e31';
