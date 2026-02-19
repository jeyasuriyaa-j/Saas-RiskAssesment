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
                    border: mode === 'dark' ? 'none' : `1px solid ${alpha(iconColor, 0.1)}`,
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    background: mode === 'dark' ? `${alpha(iconColor, 0.08)} !important` : `${theme.palette.background.paper} !important`,
                    boxShadow: mode === 'dark'
                        ? `inset 0 0 20px ${alpha(iconColor, 0.05)}, 0 8px 32px 0 rgba(0, 0, 0, 0.2)`
                        : `0 4px 20px 0 ${alpha(iconColor, 0.05)}`,
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
        };
        return colors[status?.toLowerCase()] || '#94a3b8';
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
                            Risk Intelligence Platform
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
                <Grid item xs={12} md={12} lg={6}>
                    <Box className="premium-glass card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '600px' },
                        minHeight: { xs: '400px', md: '600px' },
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden', // Contain the graph nodes
                        position: 'relative'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={{ xs: 2, md: 4 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex' }}>
                                <Brain size={22} style={{ color: '#8b5cf6' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Analysis</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: -0.5, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }, color: 'text.primary' }}>
                                    Risk <span className={mode === 'dark' ? "text-gradient-vibrant" : ""}>Correlation Network</span>
                                </Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
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

                <Grid item xs={12} md={12} lg={6}>
                    <Box className="premium-glass glass-outline card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '600px' },
                        minHeight: { xs: '400px', md: '600px' },
                        position: 'relative',
                        overflow: 'hidden',
                        zIndex: 2, // Ensure it's above any bleed-out
                        '&::before': mode === 'dark' ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 50%, rgba(4, 120, 87, 0.08) 100%)',
                            opacity: 0.6,
                            zIndex: 0
                        } : {},
                        '& > *': {
                            position: 'relative',
                            zIndex: 1
                        }
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={{ xs: 2, md: 4 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#10b981', 0.1) }}>
                                <Shield size={22} style={{ color: '#10b981' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Workflow</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: -0.5, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>Portfolio Lifecycle</Typography>
                            </Box>
                        </Stack>

                        <Stack spacing={3}>
                            {Object.entries(data.risks_by_status).map(([status, count]) => (
                                <Box key={status}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                        <Typography
                                            variant="caption"
                                            fontWeight={800}
                                            sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}
                                        >
                                            {status}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="900">
                                            {count}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(count / data.total_risks) * 100}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: alpha(getStatusColor(status), 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: getStatusColor(status),
                                                borderRadius: 4,
                                                boxShadow: `0 0 15px ${alpha(getStatusColor(status), 0.4)}`,
                                            },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Grid>

                {/* Row 4: Detailed Analytics & Strategic Insights */}
                <Grid item xs={12} sm={12} md={12} lg={6}>
                    <Box className="premium-glass glass-outline card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '450px' },
                        minHeight: { xs: '350px', md: '450px' },
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.12) 50%, rgba(109, 40, 217, 0.08) 100%)',
                            opacity: 0.6,
                            zIndex: 0
                        },
                        '& > *': {
                            position: 'relative',
                            zIndex: 1
                        }
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1) }}>
                                <Zap size={22} style={{ color: '#8b5cf6' }} />
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: 'text.secondary', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Aggregation</Typography>
                                <Typography variant="h6" fontWeight="900" sx={{ mt: -0.5, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>Risk Score Analytics</Typography>
                            </Box>
                        </Stack>

                        <Stack spacing={5}>
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                        Average Inherent Risk
                                    </Typography>
                                    <Typography variant="h4" fontWeight="900" color="error.main">
                                        {data.average_inherent_risk_score}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(parseFloat(data.average_inherent_risk_score) / (data.scales?.max_score || 25)) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: alpha('#ef4444', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
                                            borderRadius: 4,
                                        },
                                    }}
                                />
                            </Box>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                        Average Residual Risk
                                    </Typography>
                                    <Typography variant="h4" fontWeight="900" color="success.main">
                                        {data.average_residual_risk_score}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(parseFloat(data.average_residual_risk_score) / (data.scales?.max_score || 25)) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: alpha('#10b981', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(90deg, #10b981, #047857)',
                                            borderRadius: 4,
                                        },
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </Grid>

                <Grid item xs={12} sm={12} md={12} lg={6}>
                    <Box className="premium-glass glass-outline card-glow" sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        height: { xs: 'auto', md: '450px' },
                        minHeight: { xs: '350px', md: '450px' },
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.10) 50%, rgba(59, 130, 246, 0.08) 100%)',
                            opacity: 0.6,
                            zIndex: 0
                        },
                        '& > *': {
                            position: 'relative',
                            zIndex: 1
                        }
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
                        p: { xs: 2, sm: 3, md: 4 },
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.08) 25%, rgba(244, 63, 94, 0.06) 50%, rgba(245, 158, 11, 0.08) 75%, rgba(16, 185, 129, 0.06) 100%)',
                            opacity: 0.5,
                            zIndex: 0
                        },
                        '& > *': {
                            position: 'relative',
                            zIndex: 1
                        }
                    }}>
                        <Typography variant="h6" fontWeight="900" sx={{ mb: { xs: 2, md: 4 }, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>Top Risk Verticals</Typography>
                        <Grid container spacing={3}>
                            {data.top_risk_categories.map((category) => (
                                <Grid item xs={12} sm={6} md={3} key={category.category}>
                                    <Box
                                        className="hover-lift"
                                        sx={{
                                            p: 3,
                                            borderRadius: 4,
                                            background: alpha(theme.palette.text.primary, 0.02),
                                            border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
                                            '&:hover': {
                                                background: alpha(theme.palette.primary.main, 0.05),
                                                borderColor: alpha(theme.palette.primary.main, 0.4),
                                            }
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight="900" color="primary.main" sx={{ mb: 2.5, display: 'block', textTransform: 'uppercase', letterSpacing: 2 }}>
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
                                                <Typography variant="h4" fontWeight="900" sx={{ color: 'error.light', lineHeight: 1 }}>
                                                    {parseFloat(category.avg_score).toFixed(1)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Severity</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </Box >
    );
};

export default Dashboard;
