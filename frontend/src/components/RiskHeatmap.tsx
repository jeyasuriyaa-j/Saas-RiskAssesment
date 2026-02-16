import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
    CircularProgress
} from '@mui/material';
import { Close, ArrowForward } from '@mui/icons-material';
import { analyticsAPI, riskAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeatmapData {
    likelihood: number;
    impact: number;
    count: number;
    risk_ids: string[];
}

interface RiskScales {
    likelihood: number;
    impact: number;
}

export default function RiskHeatmap() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
    const [scales, setScales] = useState<RiskScales>({ likelihood: 5, impact: 5 });
    const [loading, setLoading] = useState(true);
    const [selectedCell, setSelectedCell] = useState<{ l: number; i: number; risks: string[] } | null>(null);
    const [cellRisks, setCellRisks] = useState<any[]>([]);
    const [loadingRisks, setLoadingRisks] = useState(false);

    useEffect(() => {
        fetchHeatmapData();
    }, []);

    const fetchHeatmapData = async () => {
        try {
            const response = await analyticsAPI.getHeatmap();
            setHeatmapData(response.data.data.heatmap);
            setScales(response.data.data.scales || { likelihood: 5, impact: 5 });
        } catch (error) {
            console.error('Failed to load heatmap:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCellData = (l: number, i: number) => {
        return heatmapData.find(d => d.likelihood === l && d.impact === i);
    };

    const getCellColor = (l: number, i: number, count: number) => {
        const score = l * i;
        const maxScore = scales.likelihood * scales.impact;
        const ratio = score / maxScore;

        // Gradient from Green (low) to Yellow (med) to Red (high)
        let color = '#ef4444'; // Bright Red
        if (ratio < 0.3) color = '#22c55e'; // Bright Green
        else if (ratio < 0.6) color = '#f59e0b'; // Bright Amber

        if (count === 0) {
            return `${color}15`; // Very faint background for the zone
        }
        return color;
    };

    const handleCellClick = async (l: number, i: number, riskIds: string[]) => {
        if (!riskIds || riskIds.length === 0) return;

        setSelectedCell({ l, i, risks: riskIds });
        setLoadingRisks(true);
        try {
            // Fetch risk details for these IDs (or just use list with filter if supported)
            // Ideally we'd have a bulk fetch or filter by IDs, but for now let's reuse list and filter client-side 
            // or basic individual fetches if count is low. 
            // BETTER: Use list with status filter (no, that's not enough). 
            // Let's assume we can fetch them or just navigate. 
            // For now, let's fetch individual risks to show titles.
            const promises = riskIds.slice(0, 10).map(id => riskAPI.get(id)); // Limit to 10 for perf
            const results = await Promise.all(promises);
            setCellRisks(results.map(r => r.data));
        } catch (error) {
            console.error('Failed to fetch cell risks:', error);
        } finally {
            setLoadingRisks(false);
        }
    };

    const handleRiskClick = (risk: any) => {
        if (user?.role === 'user') {
            navigate(`/my-risks?riskId=${risk.risk_code}`);
        } else {
            navigate(`/risks/${risk.risk_id}`);
        }
    };

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;

    return (
        <Card className="glass fade-in hover-lift" sx={{ height: '100%', overflow: 'visible' }}>
            <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Risk Heatmap
                </Typography>

                <Box sx={{ display: 'flex', position: 'relative', mt: 2, height: 300 }}>
                    {/* Y-Axis Label */}
                    <Box sx={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        textAlign: 'center',
                        mr: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: 'text.secondary'
                    }}>
                        LIKELIHOOD
                    </Box>

                    {/* Grid */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {Array.from({ length: scales.likelihood }, (_, i) => scales.likelihood - i).map(l => (
                            <Box key={`row-${l}`} sx={{ display: 'flex', flex: 1 }}>
                                {[...Array(scales.impact)].map((_, i) => {
                                    const impactVal = i + 1;
                                    const data = getCellData(l, impactVal);
                                    const count = data?.count || 0;
                                    const riskIds = data?.risk_ids || [];

                                    return (
                                        <Tooltip key={`cell-${l}-${impactVal}`} title={`${count} Risks (L:${l}, I:${impactVal})`}>
                                            <Box
                                                onClick={() => handleCellClick(l, impactVal, riskIds)}
                                                sx={{
                                                    flex: 1,
                                                    m: 0.25,
                                                    borderRadius: 0.5,
                                                    bgcolor: getCellColor(l, impactVal, count),
                                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: count > 0 ? 'pointer' : 'default',
                                                    transition: 'all 0.2s',
                                                    '&:hover': count > 0 ? {
                                                        transform: 'scale(1.05)',
                                                        zIndex: 2,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    } : {}
                                                }}
                                            >
                                                {count > 0 && (
                                                    <Typography variant="body2" fontWeight="bold" color="white">
                                                        {count}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* X-Axis Label */}
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        textAlign: 'center',
                        mt: 1,
                        fontWeight: 'bold',
                        color: 'text.secondary'
                    }}
                >
                    IMPACT
                </Typography>

                {/* Legend */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#22c55e', width: 12, height: 12 }} />
                        <Typography variant="caption">Low</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#f59e0b', width: 12, height: 12 }} />
                        <Typography variant="caption">Medium</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#ef4444', width: 12, height: 12 }} />
                        <Typography variant="caption">High</Typography>
                    </Box>
                </Box>
            </CardContent>

            <Dialog
                open={Boolean(selectedCell)}
                onClose={() => setSelectedCell(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        background: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(30, 41, 59, 0.98)'
                            : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 4,
                        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                        border: (theme) => theme.palette.mode === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.4)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: 2
                }}>
                    <Typography variant="h6" fontWeight="bold">
                        Risk List (L:{selectedCell?.l}, I:{selectedCell?.i})
                    </Typography>
                    <IconButton onClick={() => setSelectedCell(null)} size="small" sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, pt: 3, bgcolor: 'transparent' }}>
                    {loadingRisks ? (
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4} gap={2}>
                            <CircularProgress size={32} />
                            <Typography variant="body2" color="text.secondary">Fetching risk details...</Typography>
                        </Box>
                    ) : (
                        <List sx={{ py: 1 }}>
                            {cellRisks.map((risk, index) => (
                                <ListItem
                                    key={risk.risk_id}
                                    sx={{
                                        borderRadius: 3,
                                        mb: 1.5,
                                        bgcolor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(51, 65, 85, 0.6)'
                                            : 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        p: 2,
                                        '&:hover': {
                                            bgcolor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(71, 85, 105, 0.8)'
                                                : 'action.hover',
                                            borderColor: 'primary.main',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                                        },
                                        animation: `slideUp 0.3s ease-out forwards`,
                                        animationDelay: `${index * 50}ms`
                                    }}
                                    onClick={() => handleRiskClick(risk)}
                                >
                                    <ListItemText
                                        primary={risk.title || risk.statement}
                                        secondary={
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                Owner: <strong>{risk.owner_name || 'Unassigned'}</strong>
                                            </Typography>
                                        }
                                        primaryTypographyProps={{
                                            variant: 'body1',
                                            fontWeight: 600,
                                            color: 'text.primary'
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={risk.status?.toUpperCase()}
                                            size="small"
                                            color={risk.status === 'MITIGATED' ? 'success' : 'primary'}
                                            sx={{
                                                fontWeight: 'bold',
                                                fontSize: '0.65rem'
                                            }}
                                        />
                                        <ArrowForward sx={{ color: 'text.disabled', fontSize: 20 }} />
                                    </Box>
                                </ListItem>
                            ))}
                            {selectedCell?.risks && selectedCell.risks.length > 10 && (
                                <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 2 }}>
                                    Showing top 10 of {selectedCell.risks.length} risks.
                                </Typography>
                            )}
                        </List>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
