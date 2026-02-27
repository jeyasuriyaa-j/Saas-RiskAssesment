import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Stack,
    LinearProgress,
    alpha,
    useTheme
} from '@mui/material';
import {
    AlertTriangle,
    Shield,
    ClipboardList,
    CheckCircle2,
    Brain,
    Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AnimatedCounter from '../components/AnimatedCounter';
import RiskHeatmap from '../components/RiskHeatmap';
import RiskNetworkGraph from '../components/RiskNetworkGraph';
import { useThemeMode } from '../contexts/ThemeModeContext';

interface DashboardData {
    total_risks: number;
    closed_risks: number;
    risks_by_status: Record<string, number>;
    risks_by_priority: Record<string, number>;
    average_inherent_risk_score: string;
    average_residual_risk_score: string;
    top_risk_categories: any[];
    portfolio_concentration: any;
    scales: any;
}

const Dashboard = () => {
    const { user } = useAuth();
    const { mode } = useThemeMode();
    const theme = useTheme();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await analyticsAPI.getDashboardMetrics();
                setData(response.data.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading || !data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    const StatCard = ({ title, value, icon, iconColor, index }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Card
                className="premium-glass card-glow hover-lift"
                sx={{
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <CardContent sx={{ p: 3.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${iconColor}, ${alpha(iconColor, 0.7)})`,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 8px 16px ${alpha(iconColor, 0.2)}`,
                                }}
                            >
                                {icon}
                            </Box>
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 5,
                                    bgcolor: alpha(iconColor, 0.1),
                                    border: `1px solid ${alpha(iconColor, 0.1)}`
                                }}
                            >
                                <Typography variant="caption" fontWeight={900} sx={{ color: iconColor, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    Live
                                </Typography>
                            </Box>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <AnimatedCounter
                                    value={value}
                                    variant="h3"
                                    fontWeight="900"
                                    sx={{
                                        color: 'text.primary',
                                        letterSpacing: '-0.03em',
                                    }}
                                />
                                {title === 'Total Risks' && (
                                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 800 }}>
                                        +12%
                                    </Typography>
                                )}
                            </Box>
                            <Typography variant="subtitle2" fontWeight="700" sx={{ mt: 1, color: 'text.secondary', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {title}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            identified: '#6366f1',
            assessed: '#a855f7',
            mitigated: '#10b981',
            accepted: '#f59e0b',
            closed: '#3b82f6',
            active: '#22c55e',
            open: '#ef4444',
            in_progress: '#f97316',
            in_review: '#14b8a6',
        };
        return colors[status?.toLowerCase()] || '#94a3b8';
    };

    const getStatusIcon = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'mitigated' || s === 'closed') return '✓';
        if (s === 'identified') return '⚑';
        if (s === 'assessed') return '⊙';
        if (s === 'accepted') return '⌀';
        return '○';
    };


    return (
        <Box className="fade-in" sx={{ pb: 10 }}>
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <Box mb={6} display="flex" justifyContent="space-between" alignItems="flex-end">
                    <Box>
                        <Typography variant="overline" sx={{ mb: 1, color: 'primary.main', fontWeight: 900, letterSpacing: 2 }}>
                            SWOT RISK Intelligence
                        </Typography>
                        <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: '-0.04em', color: 'text.primary' }}>
                            {user?.role === 'viewer' ? 'Executive ' : ''}Analytics <span className={mode === 'dark' ? "text-gradient-vibrant" : ""}>Overview</span>
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Last updated: {new Date().toLocaleTimeString()}
                        </Typography>
                        <Typography variant="caption" color="success.main" fontWeight={800}>
                            ● Live Data Stream
                        </Typography>
                    </Box>
                </Box>
            </motion.div>

            <Grid container spacing={4}>
                {/* Row 1: Premium Glass StatCards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Risks"
                        value={data.total_risks}
                        icon={<ClipboardList size={22} />}
                        iconColor="#8b5cf6"
                        index={0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Critical"
                        value={data.risks_by_priority?.CRITICAL || data.risks_by_priority?.critical || 0}
                        icon={<AlertTriangle size={22} />}
                        iconColor="#f43f5e"
                        index={1}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Mitigated"
                        value={data.risks_by_status?.MITIGATED || data.risks_by_status?.mitigated || 0}
                        icon={<Shield size={22} />}
                        iconColor="#10b981"
                        index={2}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Closed"
                        value={data.closed_risks || 0}
                        icon={<CheckCircle2 size={22} />}
                        iconColor="#3b82f6"
                        index={3}
                    />
                </Grid>

                {/* Row 2: Full-Width Risk Heatmap (Wider) */}
                <Grid item xs={12}>
                    <Box className="premium-glass card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        minHeight: { xs: '400px', sm: '500px', md: '600px' },
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Typography variant="h6" fontWeight="900" sx={{
                            mb: { xs: 2, md: 3 },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                        }}>
                            Risk <span className={mode === 'dark' ? "text-gradient-gold" : ""}>Distribution Matrix</span>
                        </Typography>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <RiskHeatmap />
                        </Box>
                    </Box>
                </Grid>

                {/* Row 3: Mid-Tier Visualization & Analytics */}
                <Grid item xs={12} md={12} lg={6} sx={{ display: 'flex', minWidth: 0 }}>
                    <Box className="premium-glass card-glow" sx={{
                        width: '100%',
                        minWidth: 0,
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '600px' },
                        minHeight: { xs: '400px', md: '600px' },
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={{ xs: 2, md: 4 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Brain size={22} style={{ color: '#8b5cf6' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' }, display: 'block', lineHeight: 1.2 }}>Analysis</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: 0, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }, color: 'text.primary', lineHeight: 1.2 }}>
                                    Risk <span className={theme.palette.mode === 'dark' ? "text-gradient-vibrant" : ""}>Correlation Network</span>
                                </Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ flexGrow: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                            {user?.role !== 'viewer' && user?.role !== 'auditor' ? (
                                <RiskNetworkGraph />
                            ) : (
                                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                    <Typography color="text.secondary">Visualization restricted for current role</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={12} lg={6} sx={{ display: 'flex' }}>
                    <Box className="premium-glass card-glow" sx={{
                        width: '100%',
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '600px' },
                        minHeight: { xs: '400px', md: '600px' },
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={{ xs: 2, md: 3 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#10b981', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={22} style={{ color: '#10b981' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' }, display: 'block', lineHeight: 1.2 }}>Workflow</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: 0, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }, color: 'text.primary', lineHeight: 1.2 }}>Portfolio Lifecycle</Typography>
                            </Box>
                        </Stack>

                        <Stack spacing={2} sx={{ flexGrow: 1 }}>
                            {Object.entries(data.risks_by_status).map(([status, count]) => {
                                const color = getStatusColor(status);
                                const pct = data.total_risks > 0 ? Math.round((count / data.total_risks) * 100) : 0;
                                return (
                                    <Box
                                        key={status}
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            background: alpha(color, mode === 'dark' ? 0.1 : 0.05),
                                            border: `1px solid ${alpha(color, 0.2)}`,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                background: alpha(color, mode === 'dark' ? 0.18 : 0.1),
                                                transform: 'translateX(4px)'
                                            }
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.2}>
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Box sx={{
                                                    width: 32, height: 32,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: '0.75rem', fontWeight: 900,
                                                    boxShadow: `0 4px 10px ${alpha(color, 0.35)}`
                                                }}>
                                                    {getStatusIcon(status)}
                                                </Box>
                                                <Typography variant="caption" fontWeight={800}
                                                    sx={{ textTransform: 'uppercase', letterSpacing: 1.5, color }}
                                                >
                                                    {status.replace(/_/g, ' ')}
                                                </Typography>
                                            </Stack>
                                            <Stack direction="row" alignItems="baseline" spacing={0.5}>
                                                <Typography variant="h6" fontWeight="900" sx={{ color }}>{count}</Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>({pct}%)</Typography>
                                            </Stack>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={pct}
                                            sx={{
                                                height: 6,
                                                borderRadius: 4,
                                                bgcolor: alpha(color, 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
                                                    borderRadius: 4,
                                                    boxShadow: `0 0 10px ${alpha(color, 0.5)}`,
                                                },
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                </Grid>


                {/* Row 4: Detailed Analytics & Strategic Insights */}
                <Grid item xs={12} sm={12} md={12} lg={6}>
                    <Box className="premium-glass card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '450px' },
                        minHeight: { xs: '350px', md: '450px' },
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Background Accent */}
                        <Box sx={{
                            position: 'absolute', top: 0, right: 0,
                            width: 180, height: 180,
                            background: `radial-gradient(circle, ${alpha('#ef4444', 0.08)}, transparent 70%)`,
                            pointerEvents: 'none'
                        }} />
                        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1) }}>
                                <Zap size={22} style={{ color: '#8b5cf6' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Aggregation</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: -0.5, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>Risk Score Analytics</Typography>
                            </Box>
                        </Stack>

                        <Stack spacing={4}>
                            {/* Inherent Risk */}
                            <Box sx={{ p: 2.5, borderRadius: 3, background: alpha('#ef4444', 0.05), border: `1px solid ${alpha('#ef4444', 0.12)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Average Inherent Risk</Typography>
                                    <Box sx={{
                                        px: 2, py: 0.5, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                        boxShadow: '0 4px 12px rgba(239,68,68,0.35)'
                                    }}>
                                        <Typography variant="h5" fontWeight="900" sx={{ color: '#fff', lineHeight: 1 }}>
                                            {data.average_inherent_risk_score}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(parseFloat(data.average_inherent_risk_score) / (data.scales?.max_score || 25)) * 100}
                                    sx={{
                                        height: 10, borderRadius: 4,
                                        bgcolor: alpha('#ef4444', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
                                            borderRadius: 4,
                                            boxShadow: '0 0 12px rgba(239,68,68,0.4)'
                                        },
                                    }}
                                />
                            </Box>

                            {/* Residual Risk */}
                            <Box sx={{ p: 2.5, borderRadius: 3, background: alpha('#10b981', 0.05), border: `1px solid ${alpha('#10b981', 0.12)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Average Residual Risk</Typography>
                                    <Box sx={{
                                        px: 2, py: 0.5, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #10b981, #047857)',
                                        boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                                    }}>
                                        <Typography variant="h5" fontWeight="900" sx={{ color: '#fff', lineHeight: 1 }}>
                                            {data.average_residual_risk_score}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(parseFloat(data.average_residual_risk_score) / (data.scales?.max_score || 25)) * 100}
                                    sx={{
                                        height: 10, borderRadius: 4,
                                        bgcolor: alpha('#10b981', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(90deg, #10b981, #047857)',
                                            borderRadius: 4,
                                            boxShadow: '0 0 12px rgba(16,185,129,0.4)'
                                        },
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </Grid>


                <Grid item xs={12} sm={12} md={12} lg={6}>
                    <Box className="premium-glass card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '450px' },
                        minHeight: { xs: '350px', md: '450px' },
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1) }}>
                                <Brain size={22} style={{ color: '#8b5cf6' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Strategic</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: -0.5, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>AI Risk Insights</Typography>
                            </Box>
                        </Stack>

                        <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ mb: 4 }}>
                                <Stack direction="row" justifyContent="space-between" mb={1.5}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                        Category Clustering
                                    </Typography>
                                    <Typography variant="h6" fontWeight="900">
                                        {data.portfolio_concentration?.concentration_score}%
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={data.portfolio_concentration?.concentration_score || 0}
                                    sx={{ height: 10, borderRadius: 5, bgcolor: alpha('#3b82f6', 0.1) }}
                                />
                            </Box>

                            <Box sx={{
                                p: 3.5,
                                borderRadius: 4,
                                bgcolor: alpha('#8b5cf6', 0.05),
                                border: `1px solid ${alpha('#8b5cf6', 0.1)}`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: '#8b5cf6' }} />
                                <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary', fontWeight: 600, fontStyle: 'italic' }}>
                                    "{data.portfolio_concentration?.concentration_score && data.portfolio_concentration.concentration_score > 60
                                        ? `Warning: Systemic risk detected. High concentration in ${data.portfolio_concentration.top_concentrated_category} may lead to cascaded failures.`
                                        : "Optimal Portfolio: Your risk exposure is well-balanced across all operational verticals."}"
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <Box className="premium-glass card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 }
                    }}>
                        <Typography variant="h6" fontWeight="900" sx={{ mb: { xs: 2, md: 4 }, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>Top Risk Verticals</Typography>
                        <Grid container spacing={3}>
                            {data.top_risk_categories.map((category, i) => {
                                const accentColors = ['#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
                                const color = accentColors[i % accentColors.length];
                                return (
                                    <Grid item xs={12} sm={6} md={3} key={category.category}>
                                        <Box
                                            className="hover-lift"
                                            sx={{
                                                p: 3,
                                                borderRadius: 4,
                                                background: alpha(color, mode === 'dark' ? 0.08 : 0.04),
                                                border: `1px solid ${alpha(color, 0.2)}`,
                                                position: 'relative',
                                                overflow: 'hidden',
                                                '&:hover': {
                                                    background: alpha(color, mode === 'dark' ? 0.14 : 0.08),
                                                    borderColor: alpha(color, 0.5),
                                                }
                                            }}
                                        >
                                            {/* Colored top accent */}
                                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.4)})` }} />
                                            <Typography variant="caption" fontWeight="900" sx={{ mb: 2.5, display: 'block', textTransform: 'uppercase', letterSpacing: 2, color }}>
                                                {category.category}
                                            </Typography>
                                            <Stack direction="row" spacing={3} alignItems="flex-end">
                                                <Box>
                                                    <Typography variant="h3" fontWeight="900" sx={{ color: 'text.primary', lineHeight: 1 }}>
                                                        {category.count}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Volume</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="h4" fontWeight="900" sx={{ color, lineHeight: 1 }}>
                                                        {parseFloat(category.avg_score).toFixed(1)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Avg Score</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                </Grid>

            </Grid>
        </Box >
    );
};

export default Dashboard;
