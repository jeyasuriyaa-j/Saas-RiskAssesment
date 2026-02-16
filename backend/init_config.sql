INSERT INTO system_config (key, value) VALUES ('scoring', '{"scales": {"likelihood": 5, "impact": 5}}') ON CONFLICT (key) DO NOTHING;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS current_assignee_ids UUID[] DEFAULT '{}';
