import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { query } from '../database/connection';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
        email: string;
        role: string;
        departmentId?: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // Get user from database
        const result = await query(
            `SELECT user_id, tenant_id, email, role, is_active, department_id 
       FROM users 
       WHERE user_id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            throw new AppError('User not found', 401);
        }

        const user = result.rows[0];

        if (!user.is_active) {
            throw new AppError('User account is inactive', 401);
        }

        // Attach user to request
        req.user = {
            userId: user.user_id,
            tenantId: user.tenant_id,
            email: user.email,
            role: user.role,
            departmentId: user.department_id
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401));
        } else {
            next(error);
        }
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError('Insufficient permissions', 403));
        }

        next();
    };
};

// Granular permission definitions
export const PERMISSIONS = {
    // Risk permissions
    RISK_VIEW: ['admin', 'risk_manager', 'auditor', 'viewer', 'user'],
    RISK_CREATE: ['admin', 'risk_manager'],
    RISK_EDIT: ['admin', 'risk_manager', 'user'], // User allowed here for their own risks, filtered by logic
    RISK_EDIT_LIMITED: ['admin', 'risk_manager', 'user'],
    RISK_DELETE: ['admin', 'risk_manager'],
    RISK_ASSIGN: ['admin', 'risk_manager'],

    // Task/Remediation permissions
    TASK_VIEW_ALL: ['admin', 'risk_manager', 'auditor', 'viewer'],
    TASK_VIEW_OWN: ['admin', 'risk_manager', 'auditor', 'viewer', 'user'],
    TASK_CREATE: ['admin', 'risk_manager'],
    TASK_UPDATE_ALL: ['admin', 'risk_manager'],
    TASK_UPDATE_OWN: ['admin', 'risk_manager', 'user'],

    // Import permissions
    IMPORT_UPLOAD: ['admin', 'risk_manager'],
    IMPORT_CONFIRM: ['admin', 'risk_manager'],

    // Control permissions
    CONTROL_VIEW: ['admin', 'risk_manager', 'auditor', 'viewer', 'user'],
    CONTROL_MANAGE: ['admin', 'risk_manager'],

    // Admin permissions
    USER_MANAGE: ['admin'],
    CONFIG_MANAGE: ['admin', 'risk_manager'],
    AUDIT_VIEW: ['admin', 'risk_manager', 'auditor']
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// Authorize based on specific permission
export const authorizeAction = (permission: PermissionKey) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }

        const allowedRoles = PERMISSIONS[permission];
        if (!allowedRoles.includes(req.user.role as any)) {
            return next(new AppError(`Insufficient permissions for ${permission}`, 403));
        }

        next();
    };
};

// Fields that users (non-managers) can edit
export const USER_EDITABLE_RISK_FIELDS = ['comment', 'notes', 'user_notes'];
export const USER_EDITABLE_TASK_FIELDS = ['status', 'notes', 'completion_notes', 'progress_percent'];
