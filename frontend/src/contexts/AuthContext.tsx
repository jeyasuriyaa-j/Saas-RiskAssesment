import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

interface User {
    user_id: string;
    tenant_id: string;
    email: string;
    full_name: string;
    role: string;
    org_name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    loading: boolean;
    config: any;
    refreshConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const refreshConfig = async () => {
        try {
            const response = await authAPI.getConfig();
            setConfig(response.data);
            sessionStorage.setItem('config', JSON.stringify(response.data));
        } catch (error) {
            console.error('Failed to fetch tenant config:', error);
        }
    };

    useEffect(() => {
        // Check if user is already logged in and validate token
        const checkAuth = async () => {
            const token = sessionStorage.getItem('access_token');
            const savedUser = sessionStorage.getItem('user');
            const savedConfig = sessionStorage.getItem('config');

            if (token && savedUser) {
                try {
                    // Validate token by fetching current user
                    await authAPI.getConfig();
                    setUser(JSON.parse(savedUser));
                    if (savedConfig) setConfig(JSON.parse(savedConfig));
                    refreshConfig();
                } catch (error) {
                    // Token is invalid or expired, clear storage
                    sessionStorage.removeItem('access_token');
                    sessionStorage.removeItem('refresh_token');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('config');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await authAPI.login(email, password);
            const { user, access_token, refresh_token } = response.data;

            sessionStorage.setItem('access_token', access_token);
            sessionStorage.setItem('refresh_token', refresh_token);
            sessionStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            await refreshConfig();
        } catch (error) {
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await authAPI.register(data);
            const { user, access_token, refresh_token } = response.data;

            sessionStorage.setItem('access_token', access_token);
            sessionStorage.setItem('refresh_token', refresh_token);
            sessionStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            await refreshConfig();
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');

        // Clear Import State
        sessionStorage.removeItem('import_job_id');
        sessionStorage.removeItem('import_active_step');

        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token: sessionStorage.getItem('access_token'),
                isAuthenticated: !!user,
                login,
                register,
                logout,
                loading,
                config,
                refreshConfig,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
