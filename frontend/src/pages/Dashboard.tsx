import { useEffect, useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    Card,
    CardContent,
    CircularProgress,
    LinearProgress,
    Stack,
    Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Zap,
    Shield,
    TrendingUp,
    Brain
} from 'lucide-react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AnimatedCounter from '../components/AnimatedCounter';
import RiskHeatmap from '../components/RiskHeatmap';

import RiskNetworkGraph from '../components/RiskNetworkGraph';

interface DashboardData {
    total_risks: number;
    closed_risks: number;
    risks_by_status: Record<string, number>;
    risks_by_priority: Record<string, number>;
    average_inherent_risk_score: string;
    average_residual_risk_score: string;
    risks_overdue_review: number;
    top_risk_categories: Array<{
        category: string;
        count: number;
        avg_score: string;
    }>;
    scales?: {
        likelihood: number;
        impact: number;
        max_score: number;
    };
    portfolio_concentration?: {
        concentration_score: number;
        high_risk_density: number;
        top_concentrated_category: string;
    };
}

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const response = await analyticsAPI.getDashboardMetrics();
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return <Typography>Failed to load dashboard data</Typography>;
    }

    const StatCard = ({ title, value, icon, iconColor, index }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Card
                className="hover-lift"
                sx={{
                    background: `linear-gradient(135deg, ${alpha(iconColor, 0.1)} 0%, ${alpha(iconColor, 0.02)} 100%)`,
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${alpha(iconColor, 0.2)}`,
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        border: `1px solid ${alpha(iconColor, 0.5)}`,
                        boxShadow: `0 0 30px ${alpha(iconColor, 0.2)}`,
                        transform: 'translateY(-6px)',
                        '& .icon-glow': {
                            transform: 'scale(1.1) rotate(5deg)',
                            boxShadow: `0 0 25px ${alpha(iconColor, 0.4)}`,
                        }
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box
                                className="icon-glow"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${iconColor}, ${alpha(iconColor, 0.6)})`,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 4px 15px ${alpha(iconColor, 0.3)}`,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {icon}
                            </Box>
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 20,
                                    bgcolor: alpha(iconColor, 0.1),
                                    border: `1px solid ${alpha(iconColor, 0.2)}`
                                }}
                            >
                                <Typography variant="caption" fontWeight={800} sx={{ color: 'white', letterSpacing: 1, opacity: 0.9 }}>
                                    {title.toUpperCase()}
                                </Typography>
                            </Box>
                        </Box>

                        <Box mt="auto">
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <AnimatedCounter
                                    value={value}
                                    variant="h3"
                                    fontWeight="800"
                                    sx={{
                                        color: 'text.primary',
                                        letterSpacing: '-0.02em',
                                    }}
                                />
                                {title === 'Total Risks' && (
                                    <Typography variant="body2" sx={{ color: 'primary.light', fontWeight: 600 }}>
                                        +12%
                                    </Typography>
                                )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.6, fontWeight: 500 }}>
                                Active in portfolio
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            identified: '#3b82f6',
            assessed: '#8b5cf6',
            mitigated: '#10b981',
            accepted: '#f59e0b',
            closed: '#6b7280',
        };
        return colors[status?.toLowerCase()] || '#6b7280';
    };

    return (
        <Box className="fade-in">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <Box mb={4}>
                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
                        {user?.role === 'viewer' ? 'Executive ' : ''}Risk <span className="text-gradient">Dashboard</span>
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: '1.1rem', opacity: 0.7 }}>
                        {user?.role === 'viewer'
                            ? 'High-level strategic overview for board oversight'
                            : 'Real-time overview of your risk portfolio and AI-driven insights'}
                    </Typography>
                </Box>
            </motion.div>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Risks"
                        value={data.total_risks}
                        icon={<ClipboardList size={24} />}
                        iconColor="#8b5cf6"
                        index={0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Critical"
                        value={data.risks_by_priority?.CRITICAL || data.risks_by_priority?.critical || 0}
                        icon={<AlertTriangle size={24} />}
                        iconColor="#f43f5e"
                        index={1}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Mitigated"
                        value={data.risks_by_status?.MITIGATED || data.risks_by_status?.mitigated || 0}
                        icon={<Shield size={24} />}
                        iconColor="#10b981"
                        index={2}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Closed"
                        value={data.closed_risks || 0}
                        icon={<CheckCircle2 size={24} />}
                        iconColor="#3b82f6"
                        index={3}
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <RiskHeatmap />
                </Grid>

                {/* Risk Correlation Network - Hide for Board/Auditor to simplify */}
                {user?.role !== 'viewer' && user?.role !== 'auditor' && (
                    <Grid item xs={12} md={6}>
                        <RiskNetworkGraph />
                    </Grid>
                )}

                {/* Risk Scores */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', border: '1px solid var(--border-soft)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                                <Zap size={22} style={{ color: '#8b5cf6' }} />
                                <Typography variant="h6" fontWeight="700">
                                    Risk Scores
                                </Typography>
                            </Stack>

                            <Stack spacing={3}>
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Average Inherent Risk
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold" color="error.main">
                                            {data.average_inherent_risk_score}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(parseFloat(data.average_inherent_risk_score) / (data.scales?.max_score || 25)) * 100}
                                        className="progress-animate"
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>

                                <Divider />

                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Average Residual Risk
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold" color="success.main">
                                            {data.average_residual_risk_score}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(parseFloat(data.average_residual_risk_score) / (data.scales?.max_score || 25)) * 100}
                                        className="progress-animate"
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: 'rgba(16, 185, 129, 0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Risks by Status */}
                <Grid item xs={12} md={6}>
                    <Card className="glass fade-in hover-lift" sx={{ height: '100%', border: '1px solid var(--border-soft)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                                <Shield size={22} style={{ color: '#10b981' }} />
                                <Typography variant="h6" fontWeight="700">
                                    Risks by Status
                                </Typography>
                            </Stack>

                            <Stack spacing={2}>
                                {Object.entries(data.risks_by_status).map(([status, count]) => (
                                    <Box key={status}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                sx={{ textTransform: 'capitalize' }}
                                            >
                                                {status}
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {count}
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(count / data.total_risks) * 100}
                                            className="progress-animate"
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: `${getStatusColor(status)}20`,
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: getStatusColor(status),
                                                    borderRadius: 3,
                                                },
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Portfolio Concentration & Top Risk Categories */}
                <Grid item xs={12} md={4}>
                    <Card className="glass fade-in hover-lift" sx={{ height: '100%', border: '1px solid var(--border-soft)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                                <TrendingUp size={22} style={{ color: '#3b82f6' }} />
                                <Typography variant="h6" fontWeight="700">
                                    Portfolio Concentration
                                </Typography>
                            </Stack>

                            <Stack spacing={4}>
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Category Clustering
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {data.portfolio_concentration?.concentration_score}%
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={data.portfolio_concentration?.concentration_score || 0}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        Mainly in: {data.portfolio_concentration?.top_concentrated_category}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Stack direction="row" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            High/Critical Density
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {data.portfolio_concentration?.high_risk_density}%
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={data.portfolio_concentration?.high_risk_density || 0}
                                        color={data.portfolio_concentration?.high_risk_density && data.portfolio_concentration.high_risk_density > 50 ? 'error' : 'primary'}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        Risk cluster in top-right quadrant
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 2, bgcolor: alpha('#8b5cf6', 0.05), borderRadius: 2, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                        <Brain size={16} style={{ color: '#8b5cf6' }} />
                                        <Typography variant="body2" color="primary.main" fontWeight="800" sx={{ letterSpacing: 0.5 }}>
                                            AI INSIGHT
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2">
                                        {data.portfolio_concentration?.concentration_score && data.portfolio_concentration.concentration_score > 60
                                            ? `Caution: Your risks are heavily concentrated in ${data.portfolio_concentration.top_concentrated_category}. Diversify focus.`
                                            : "Your portfolio is well-distributed across categories."}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card className="glass fade-in" sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Top Risk Categories
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                {data.top_risk_categories.map((category, index) => (
                                    <Grid item xs={12} sm={6} key={category.category}>
                                        <Card
                                            className="hover-lift"
                                            sx={{
                                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                                                border: '1px solid rgba(102, 126, 234, 0.2)',
                                                animationDelay: `${index * 100}ms`,
                                            }}
                                        >
                                            <CardContent>
                                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                                    {category.category}
                                                </Typography>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Box>
                                                        <Typography variant="h4" fontWeight="bold" color="primary">
                                                            {category.count}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            risks
                                                        </Typography>
                                                    </Box>
                                                    <Divider orientation="vertical" flexItem />
                                                    <Box>
                                                        <Typography variant="h5" fontWeight="bold" color="text.primary">
                                                            {parseFloat(category.avg_score).toFixed(1)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            avg score
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
