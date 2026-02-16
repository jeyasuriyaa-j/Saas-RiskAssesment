-- 1. Create Departments
CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manager_user_id UUID, -- Circular ref to users, handled by separate constraint
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- 2. Update Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL;

-- Add FK for department manager back to users
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_user_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- 3. Update Risks: Add Dept & Assignees
ALTER TABLE risks ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id) ON DELETE CASCADE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS current_assignee_ids UUID[];

-- 4. Update Risk Status Enum
-- Note: 'DRAFT', 'ACTIVE', 'MITIGATED', 'CLOSED', 'DELETED' exist.
-- We map 'ACTIVE' to 'OPEN' concept if needed, or just add new states.
-- Using 'safe' blocks for enum updates to avoid errors if they exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'OPEN') THEN
        ALTER TYPE risk_status ADD VALUE 'OPEN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'IN_PROGRESS') THEN
        ALTER TYPE risk_status ADD VALUE 'IN_PROGRESS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'REJECTED') THEN
        ALTER TYPE risk_status ADD VALUE 'REJECTED';
    END IF;
END$$;

-- 5. Risk Assignments
CREATE TABLE IF NOT EXISTS risk_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACCEPTED, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignment_user ON risk_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_risk ON risk_assignments(risk_id);

-- 6. Risk Comments
CREATE TABLE IF NOT EXISTS risk_comments (
    comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_risk ON risk_comments(risk_id);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- ASSIGNMENT, COMMENT, STATUS_CHANGE, OVERDUE
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
