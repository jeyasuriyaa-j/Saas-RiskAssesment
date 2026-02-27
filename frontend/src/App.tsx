import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import SecuritySettings from './pages/SecuritySettings';
import Dashboard from './pages/Dashboard';
import RiskList from './pages/RiskList';
import RiskDetail from './pages/RiskDetail';
import ImportExcel from './pages/ImportExcel';
import DocumentAnalysis from './pages/DocumentAnalysis';
import AdminSettings from './pages/admin/Settings';
import Users from './pages/admin/Users';
import Controls from './pages/Controls';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Governance from './pages/Governance';
import ExecutiveReport from './pages/ExecutiveReport';
import RiskMap from './pages/RiskMap';
import MyRisks from './pages/MyRisks';
import Vendors from './pages/Vendors';
import Layout from './components/Layout';

interface RoleRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && user) {
        const userRole = user.role?.toLowerCase() || '';
        if (!allowedRoles.includes(userRole)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}

function RootRedirect() {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

function App() {
    return (
        <>
            <div className="glow-mesh" />
            <ThemeModeProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/security" element={<RoleRoute><SecuritySettings /></RoleRoute>} />

                        {/* Landing Page is now Login */}
                        <Route path="/" element={<RootRedirect />} />

                        {/* Protected Routes (Flat Structure) */}
                        <Route
                            element={
                                <RoleRoute>
                                    <Layout />
                                </RoleRoute>
                            }
                        >
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="my-risks" element={<RoleRoute allowedRoles={['user', 'admin']}><MyRisks /></RoleRoute>} />

                            {/* Manager/Admin only routes */}
                            <Route path="risks" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor', 'viewer', 'user']}><RiskList /></RoleRoute>} />
                            <Route path="risks/:riskId" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor', 'viewer', 'user']}><RiskDetail /></RoleRoute>} />
                            <Route path="controls" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor']}><Controls /></RoleRoute>} />
                            <Route path="governance/report" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor', 'viewer']}><ExecutiveReport /></RoleRoute>} />
                            <Route path="governance/map" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor', 'viewer']}><RiskMap /></RoleRoute>} />
                            <Route path="import" element={<RoleRoute allowedRoles={['admin', 'risk_manager']}><ImportExcel /></RoleRoute>} />
                            <Route path="import/files" element={<RoleRoute allowedRoles={['admin', 'risk_manager']}><DocumentAnalysis /></RoleRoute>} />

                            <Route path="incidents" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'user', 'auditor', 'viewer']}><Incidents /></RoleRoute>} />
                            <Route path="incidents/:eventId" element={<RoleRoute allowedRoles={['admin', 'risk_manager', 'user', 'auditor', 'viewer']}><IncidentDetail /></RoleRoute>} />

                            <Route
                                path="governance"
                                element={
                                    <RoleRoute allowedRoles={['admin', 'risk_manager']}>
                                        <Governance />
                                    </RoleRoute>
                                }
                            />
                            <Route
                                path="governance/vendors"
                                element={
                                    <RoleRoute allowedRoles={['admin', 'risk_manager', 'auditor']}>
                                        <Vendors />
                                    </RoleRoute>
                                }
                            />

                            {/* Admin Routes */}
                            <Route
                                path="admin/settings"
                                element={
                                    <RoleRoute allowedRoles={['admin']}>
                                        <AdminSettings />
                                    </RoleRoute>
                                }
                            />
                            <Route
                                path="admin/users"
                                element={
                                    <RoleRoute allowedRoles={['admin']}>
                                        <Users />
                                    </RoleRoute>
                                }
                            />
                        </Route>
                    </Routes>
                </AuthProvider>
            </ThemeModeProvider>
        </>
    );
}

export default App;
