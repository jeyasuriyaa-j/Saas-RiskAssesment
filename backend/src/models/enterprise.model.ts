
export interface Department {
    department_id: string;
    tenant_id: string;
    name: string;
    manager_user_id?: string;
    created_at?: Date;
}

export interface RiskAssignment {
    assignment_id: string;
    risk_id: string;
    user_id: string;
    assigned_at: Date;
    due_date?: Date;
    status: 'PENDING' | 'ACCEPTED' | 'COMPLETED';
}

export interface RiskComment {
    comment_id: string;
    risk_id: string;
    user_id: string;
    text: string;
    created_at: Date;
    user_name?: string; // Joined field
    user_role?: string; // Joined field
}

export interface Notification {
    notification_id: string;
    user_id: string;
    type: 'ASSIGNMENT' | 'COMMENT' | 'STATUS_CHANGE' | 'OVERDUE';
    message: string;
    is_read: boolean;
    link?: string;
    created_at: Date;
}
