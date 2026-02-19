import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';
const API_BASE_URL = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = sessionStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
                    refresh_token: refreshToken,
                });

                const { access_token } = response.data;
                sessionStorage.setItem('access_token', access_token);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                handleLogout();
                return Promise.reject(refreshError);
            }
        }

        // Handle case where we still get 401 even after retry, or any other 401
        // Skip handleLogout for login and register requests so the components can handle errors
        const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
        if (error.response?.status === 401 && !isAuthRequest) {
            handleLogout();
        }

        return Promise.reject(error);
    }
);

// Helper function to centralize logout logic
function handleLogout() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('config');
    sessionStorage.removeItem('import_job_id');
    sessionStorage.removeItem('import_active_step');
    window.location.href = '/login';
}

// Admin API
export const adminAPI = {
    getConfig: () => api.get('admin/config'),
    updateConfig: (data: any) => api.put('admin/config', data),
    getAudit: (params?: any) => api.get('admin/audit', { params }),
    clearPendingImportJobs: () => api.delete('admin/import-jobs/pending'),
};

// Users API
export const usersAPI = {
    list: (params?: any) => api.get('users', { params }),
    invite: (data: any) => api.post('users/invite', data),
    updateRole: (userId: string, role: string) => api.patch(`users/${userId}/role`, { role }),
    updateStatus: (userId: string, isActive: boolean) => api.patch(`users/${userId}/status`, { is_active: isActive }),
    delete: (userId: string) => api.delete(`users/${userId}`),
    byDepartment: (department: string) => api.get('users/by-department', { params: { department } }),
    assignable: (department?: string) => api.get('users/assignable', { params: department ? { department } : {} }),
};

// Auth API
export const authAPI = {
    register: (data: any) => api.post('auth/register', data),
    login: (email: string, password: string) => api.post('auth/login', { email, password }),
    initSSO: (subdomain: string) => api.get(`auth/sso/init/${subdomain}`),
    refresh: (refreshToken: string) => api.post('auth/refresh', { refresh_token: refreshToken }),
    getConfig: () => api.get('auth/config'),

    // MFA
    mfaVerify: (mfaToken: string, otpCode: string) => api.post('auth/mfa/verify', { mfa_token: mfaToken, otp_code: otpCode }),
    mfaSetup: () => api.post('auth/mfa/setup'),
    mfaConfirm: (otpCode: string) => api.post('auth/mfa/confirm', { otp_code: otpCode }),
};

// Risk API
export const riskAPI = {
    list: (params?: any) => api.get('risks', { params }),
    get: (riskId: string) => api.get(`risks/${riskId}`),
    create: (data: any) => api.post('risks', data),
    update: (riskId: string, data: any) => api.put(`risks/${riskId}`, data),
    delete: (riskId: string, permanent: boolean = false) => api.delete(`risks/${riskId}`, { params: { permanent } }),
    bulkDelete: (riskIds: string[], permanent: boolean = false) => api.post('risks/bulk-delete', { risk_ids: riskIds, permanent }),
    assign: (riskId: string, assigneeId: string, dueDate: string) => api.post(`risks/${riskId}/assign`, { assignee_id: assigneeId, due_date: dueDate }),

    // AI Suggestions (Persistent)
    suggestImprovement: (riskId: string, data: any) => api.post(`risks/${riskId}/suggest-improvement`, data),
    getImprovementSuggestion: (riskId: string, requestId: string) => api.get(`risks/${riskId}/suggestions/${requestId}`),

    suggestScore: (riskId: string, data: any) => api.post(`risks/${riskId}/suggest-score`, data),
    getScoreSuggestion: (riskId: string, requestId: string) => api.get(`risks/${riskId}/score-suggestions/${requestId}`),

    updateSuggestionStatus: (riskId: string, requestId: string, action: string) => api.patch(`risks/${riskId}/suggestions/${requestId}`, { action }),
    analyze: (riskId: string, force: boolean = false) => api.post(`risks/${riskId}/analyze`, { force }),
    analyzeCorrelations: (riskIds?: string[]) => api.post('risks/analyze-correlations', { riskIds }),
};

// Import API
export const importAPI = {
    upload: (file: File, onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
    },
    getJob: (jobId: string) => api.get(`import/jobs/${jobId}`),
    confirmMapping: (jobId: string, data: any) => api.post(`import/jobs/${jobId}/confirm-mapping`, data),
    finalizeImport: (jobId: string, data: any) => api.post(`import/jobs/${jobId}/finalize`, data),
    getResults: (jobId: string) => api.get(`import/jobs/${jobId}/results`),
    getAiAnalysis: (jobId: string) => api.get(`import/jobs/${jobId}/ai-analysis`),
    getAnalysisProgress: (jobId: string) => api.get(`import/jobs/${jobId}/analysis-progress`),
    analyzeRisks: (jobId: string) => api.post(`import/jobs/${jobId}/analyze-risks`),
};

// AI API
export const aiAPI = {
    suggestScore: (data: any) => api.post('ai/suggest-score', data),
    improveDescription: (rawRisk: string) => api.post('ai/improve-description', { raw_risk: rawRisk }),
    recommendControls: (data: any) => api.post('ai/recommend-controls', data),
};

// Document API
export const documentAPI = {
    analyze: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('documents/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Analytics API
export const analyticsAPI = {
    getDashboardMetrics: () => api.get('analytics/dashboard'),
    getHeatmap: () => api.get('analytics/heatmap'),
    getBoardSummary: () => api.get('analytics/board-summary'),
    generateStakeholderBrief: (audience: string) => api.post('reports/stakeholder-brief', { audience })
};

// Controls API
export const controlsAPI = {
    list: () => api.get('controls'),
    get: (id: string) => api.get(`controls/${id}`),
    create: (data: any) => api.post('controls', data),
    update: (id: string, data: any) => api.put(`controls/${id}`, data),
    delete: (id: string) => api.delete(`controls/${id}`),
    assign: (riskId: string, data: any) => api.post(`controls/risks/${riskId}/assign`, data),
    assessEffectiveness: (riskId: string) => api.get(`controls/risks/${riskId}/assess-effectiveness`),
};

// Remediation API
export const remediationAPI = {
    create: (data: any) => api.post('remediation', data),
    update: (id: string, data: any) => api.put(`remediation/${id}`, data),
    suggest: (riskId: string) => api.post('remediation/suggest', { risk_id: riskId }),
    assign: (data: any) => api.post('remediation/assign', data),
    myTasks: () => api.get('remediation/my-tasks'),
    getAssignedTasks: (riskId: string) => api.get(`remediation/risk/${riskId}/assigned-tasks`),
};

// Events API
export const eventsAPI = {
    list: (params?: any) => api.get('events', { params }),
    create: (data: any) => api.post('events', data),
    get: (eventId: string) => api.get(`events/${eventId}`),
    assessImpact: (eventId: string, data: any) => api.post(`events/${eventId}/assess-risk-impact`, data),
    getAssessment: (eventId: string, requestId: string) => api.get(`events/${eventId}/risk-assessments/${requestId}`),
};

export const governanceAPI = {
    analyzeDrift: () => api.post('governance/analysis/drift'),
    getLearningRecommendations: () => api.get('governance/learning-recommendations'),
    getRiskAppetite: () => api.get('governance/risk-appetite'),
    updateRiskAppetite: (data: any) => api.put('governance/risk-appetite', data),
    getSimulationBaseline: () => api.get('governance/simulation/baseline'),
    calibrateRiskAppetite: () => api.post('governance/risk-appetite/calibrate'),
    runSimulation: (scenario: string) => api.post('governance/simulation/run', { scenario }),
};

export const complianceAPI = {
    getFrameworks: () => api.get('compliance/frameworks'),
    getClauses: (frameworkId: string) => api.get(`compliance/frameworks/${frameworkId}/clauses`),
    toggleFramework: (frameworkId: string, enabled: boolean) => api.patch(`compliance/frameworks/${frameworkId}`, { enabled }),
    getRiskMappings: (riskId: string) => api.get(`compliance/risks/${riskId}/mappings`),
    saveMapping: (data: any) => api.post('compliance/mappings', data),
    getDashboard: () => api.get('compliance/dashboard'),
    createFramework: (name: string) => api.post('compliance/frameworks', { framework_name: name }),
    addClause: (frameworkId: string, data: any) => api.post(`compliance/frameworks/${frameworkId}/clauses`, data),
    updateEffectiveness: (controlId: string, data: any) => api.patch(`compliance/controls/${controlId}/effectiveness`, data)
};

export const vendorAPI = {
    list: () => api.get('vendors'),
    create: (data: any) => api.post('vendors', data),
    get: (id: string) => api.get(`vendors/${id}`),
    update: (id: string, data: any) => api.put(`vendors/${id}`, data),
    assess: (id: string, data: any) => api.post(`vendors/${id}/assess`, data),
};

// Chat API
export const chatAPI = {
    sendMessage: (message: string, history: any[] = []) => api.post('chat', { message, history }),
};

// Notifications API
export const notificationsAPI = {
    list: () => api.get('notifications'),
    markAsRead: (id: string) => api.patch(`notifications/${id}/read`),
    getUnreadCount: () => api.get('notifications/unread-count'),
};

// My Risks API
export const myRisksAPI = {
    dashboard: () => api.get('my-risks/dashboard'),
    list: (params?: { status?: string; overdue?: boolean }) => api.get('my-risks', { params }),
    get: (riskId: string) => api.get(`my-risks/${riskId}`),
    updateTask: (riskId: string, data: { action_plan?: string; notes?: string; status?: string }) =>
        api.put(`my-risks/${riskId}/task`, data),
    upload: (riskId: string, data: { file_name: string; file_path: string; file_size?: number; mime_type?: string }) =>
        api.post(`my-risks/${riskId}/upload`, data),
};

export default api;
