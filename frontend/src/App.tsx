import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import Login from './pages/Login';
import Register from './pages/Register';
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
import Vendors from './pages/Vendors';
import MyRisks from './pages/MyRisks';
import Layout from './components/Layout';
import PeerComparison from './pages/PeerComparison';
import SOC2Dashboard from './pages/SOC2Dashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}


function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;

    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;

    const allowedRoles = ['admin', 'risk_manager'];
    const userRole = user?.role?.toLowerCase() || '';

    if (!isAuthenticated || !allowedRoles.includes(userRole)) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
}

function ViewRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;

    const allowedRoles = ['admin', 'risk_manager', 'auditor', 'viewer', 'user'];
    const userRole = user?.role?.toLowerCase() || '';

    if (!isAuthenticated || !allowedRoles.includes(userRole)) {
        return <Navigate to="/" />;
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
                        <Route path="/login" element={<Navigate to="/" replace />} />
                        <Route path="/register" element={<Register />} />

                        {/* Landing Page is now Login */}
                        <Route path="/" element={<RootRedirect />} />

                        {/* Protected Routes (Flat Structure) */}
                        <Route
                            element={
                                <PrivateRoute>
                                    <Layout />
                                </PrivateRoute>
                            }
                        >
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="my-risks" element={<MyRisks />} />

                            {/* Manager/Admin only routes */}
                            <Route path="risks" element={<ViewRoute><RiskList /></ViewRoute>} />
                            <Route path="risks/:riskId" element={<ViewRoute><RiskDetail /></ViewRoute>} />
                            <Route path="controls" element={<ViewRoute><Controls /></ViewRoute>} />
                            <Route path="governance/report" element={<ViewRoute><ExecutiveReport /></ViewRoute>} />
                            <Route path="governance/map" element={<ViewRoute><RiskMap /></ViewRoute>} />
                            <Route path="vendors" element={<ManagerRoute><Vendors /></ManagerRoute>} />
                            <Route path="import" element={<ManagerRoute><ImportExcel /></ManagerRoute>} />
                            <Route path="document-analysis" element={<ManagerRoute><DocumentAnalysis /></ManagerRoute>} />
                            <Route path="peer-comparison" element={<ViewRoute><PeerComparison /></ViewRoute>} />
                            <Route path="soc2-dashboard" element={<ManagerRoute><SOC2Dashboard /></ManagerRoute>} />

                            <Route path="incidents" element={<ViewRoute><Incidents /></ViewRoute>} />
                            <Route path="incidents/:eventId" element={<ViewRoute><IncidentDetail /></ViewRoute>} />

                            <Route
                                path="governance"
                                element={
                                    <ViewRoute>
                                        <Governance />
                                    </ViewRoute>
                                }
                            />

                            {/* Admin Routes */}
                            <Route
                                path="admin/settings"
                                element={
                                    <ManagerRoute>
                                        <AdminSettings />
                                    </ManagerRoute>
                                }
                            />
                            <Route
                                path="admin/users"
                                element={
                                    <AdminRoute>
                                        <Users />
                                    </AdminRoute>
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
