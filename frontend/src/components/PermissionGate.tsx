import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGateProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    permission?: string; // Optional for more granular future use
    fallback?: React.ReactNode;
}

export default function PermissionGate({
    children,
    allowedRoles,
    fallback = null
}: PermissionGateProps) {
    const { user } = useAuth();

    if (!user) return <>{fallback}</>;

    const userRole = user.role?.toLowerCase();

    const hasPermission = allowedRoles
        ? allowedRoles.some(role => role.toLowerCase() === userRole)
        : true;

    if (!hasPermission) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
