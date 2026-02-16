import { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    InputAdornment,
    TextField,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Dialog,
    DialogContent,
    DialogActions,
    Stack,
    Divider,
    Tooltip,
    Zoom,
    Alert,
    useTheme,
    alpha
} from '@mui/material';
import React from 'react';
import { TransitionProps } from '@mui/material/transitions';
import {
    Search,
    CheckCircle2,
    XCircle,
    Shield,
    BarChart3,
    ArrowRight,
    X,
    Zap,
    Download,
    Check,
    RotateCcw,
    AlertTriangle,
    Brain,
    FileSpreadsheet,
    MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Zoom in ref={ref} {...props} />;
});

// --- Interfaces ---
interface AIAnalysisDashboardProps {
    aiDetailedAnalysis: any[];
    finalDecisions: {
        row_decisions: Record<number, { accepted: boolean }>;
        accept_all_ai?: boolean;
    };
    setFinalDecisions: (decisions: any) => void;
    onCancel: () => void;
    onContinue: () => void;
    isStreaming?: boolean;
    duplicateReport?: any;
}

// --- Component ---
const AIAnalysisDashboard: React.FC<AIAnalysisDashboardProps> = ({
    aiDetailedAnalysis,
    finalDecisions,
    setFinalDecisions,
    onCancel,
    onContinue,
    duplicateReport
}) => {
    const theme = useTheme();

    // --- State ---
    const [searchTerm, setSearchTerm] = useState('');
    // const [filterCategory] = useState<string | 'all'>('all'); // Removed unused state
    const [selectedRisks, setSelectedRisks] = useState<number[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerRiskIndex, setDrawerRiskIndex] = useState<number | null>(null);

    // --- Derived Stats & Filtering ---
    const { filteredRisks, stats } = useMemo(() => {
        const filtered = aiDetailedAnalysis.filter((row: any) => {
            const searchMatch =
                row.original_data?.statement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.ai_analysis?.improved_statement?.toLowerCase().includes(searchTerm.toLowerCase());
            return searchMatch;
        });

        const total = aiDetailedAnalysis.length;
        const accepted = Object.values(finalDecisions.row_decisions).filter(d => d.accepted).length;
        const rejected = Object.values(finalDecisions.row_decisions).filter(d => d.accepted === false).length;
        const pending = total - (accepted + rejected);

        return { filteredRisks: filtered, stats: { total, accepted, rejected, pending } };
    }, [aiDetailedAnalysis, searchTerm, finalDecisions]);

    const getDuplicateInfo = (rowIndex: number) => {
        if (!duplicateReport?.clusters) return null;
        const tempId = `TEMP-${rowIndex}`;
        return duplicateReport.clusters.find((c: any) =>
            (c.risk_ids || c.risks_involved || []).some((id: string) => id === tempId)
        );
    };

    // --- Actions ---
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRisks(filteredRisks.map((_, idx) => idx));
        } else {
            setSelectedRisks([]);
        }
    };

    const handleSelectRisk = (idx: number) => {
        setSelectedRisks(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const handleRowClick = (idx: number) => {
        setDrawerRiskIndex(idx);
        setDrawerOpen(true);
    };

    const handleBulkAccept = () => {
        const newDecisions = { ...finalDecisions.row_decisions };
        selectedRisks.forEach(idx => {
            newDecisions[idx] = { accepted: true };
        });
        setFinalDecisions({ ...finalDecisions, row_decisions: newDecisions });
        setSelectedRisks([]);
    };

    const handleBulkReject = () => {
        const newDecisions = { ...finalDecisions.row_decisions };
        selectedRisks.forEach(idx => {
            newDecisions[idx] = { accepted: false };
        });
        setFinalDecisions({ ...finalDecisions, row_decisions: newDecisions });
        setSelectedRisks([]);
    };

    // --- Helper for Score Color ---
    const getScoreColor = (score: number) => {
        if (score >= 20) return theme.palette.error.main;
        if (score >= 12) return theme.palette.warning.main;
        if (score >= 6) return theme.palette.info.main;
        return theme.palette.success.main;
    };

    const getDrawerRisk = () => {
        if (drawerRiskIndex === null) return null;
        return aiDetailedAnalysis[drawerRiskIndex];
    };

    const currentRisk = getDrawerRisk();
    const currentDecision = drawerRiskIndex !== null ? finalDecisions.row_decisions[drawerRiskIndex]?.accepted : undefined;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            {duplicateReport?.total_duplicates > 0 && (
                <Alert
                    severity="warning"
                    variant="filled"
                    sx={{
                        borderRadius: 2,
                        bgcolor: alpha('#f59e0b', 0.1),
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        '& .MuiAlert-icon': { color: '#f59e0b' }
                    }}
                    icon={<AlertTriangle size={20} />}
                >
                    <Typography variant="body2" fontWeight="700">
                        {duplicateReport.total_duplicates} potential duplicates identified. Review suggested merges for data integrity.
                    </Typography>
                </Alert>
            )}

            {/* 1. Top Toolbar */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                bgcolor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
                <Stack direction="row" spacing={3} alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                            width: 32, height: 32, borderRadius: 1,
                            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
                        }}>
                            <Brain size={18} color="white" />
                        </Box>
                        <Typography variant="h6" fontWeight="800" sx={{ letterSpacing: '-0.02em', textTransform: 'uppercase', fontSize: '1rem' }}>AI Review</Typography>
                    </Stack>

                    <TextField
                        placeholder="Search intelligence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><Search size={16} style={{ color: alpha('#fff', 0.4) }} /></InputAdornment>),
                        }}
                        sx={{
                            width: 280,
                            '& .MuiInputBase-root': {
                                fontSize: '0.85rem',
                                height: 36,
                                bgcolor: alpha('#fff', 0.03),
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }
                        }}
                    />

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={`${stats.total} Total`}
                            size="small"
                            sx={{ height: 26, fontWeight: 700, bgcolor: alpha('#fff', 0.05), border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <Chip
                            label={`${stats.pending} Pending`}
                            size="small"
                            sx={{ height: 26, fontWeight: 700, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                        />
                        <Chip
                            icon={<Zap size={14} style={{ color: '#10b981' }} />}
                            label={`${stats.accepted} Optimized`}
                            size="small"
                            sx={{ height: 26, fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                        />
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1.5}>
                    {selectedRisks.length > 0 ? (
                        <AnimatePresence>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ display: 'flex', gap: '8px' }}
                            >
                                <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
                                    startIcon={<CheckCircle2 size={16} />}
                                    onClick={handleBulkAccept}
                                >
                                    Approve ({selectedRisks.length})
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ color: '#ef4444', borderColor: '#ef4444', '&:hover': { borderColor: '#dc2626', bgcolor: alpha('#ef4444', 0.05) }, borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
                                    startIcon={<XCircle size={16} />}
                                    onClick={handleBulkReject}
                                >
                                    Reject
                                </Button>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <>
                            <Button
                                size="small"
                                variant="text"
                                sx={{ color: alpha('#fff', 0.5), fontWeight: 700, textTransform: 'none' }}
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                endIcon={<ArrowRight size={16} />}
                                onClick={onContinue}
                                disabled={stats.pending > 0 && !finalDecisions.accept_all_ai}
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                    px: 3
                                }}
                            >
                                Batch Import
                            </Button>
                        </>
                    )}
                    <Tooltip title="Deep Export">
                        <IconButton
                            size="small"
                            sx={{ bgcolor: alpha('#fff', 0.05), border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                        >
                            <Download size={16} style={{ color: alpha('#fff', 0.6) }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* 2. Grid Container */}
            <TableContainer
                component={Paper}
                className="glass-card"
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 2,
                    bgcolor: 'rgba(15, 23, 42, 0.2)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    '&::-webkit-scrollbar': { width: 8, height: 8 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: theme.palette.divider, borderRadius: 4 }
                }}
            >
                <Table size="small" stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                    <TableHead>
                        <TableRow sx={{
                            '& th': {
                                bgcolor: 'transparent',
                                borderBottom: 'none',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                py: 1,
                                color: alpha('#fff', 0.4),
                                letterSpacing: '0.05em'
                            }
                        }}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={selectedRisks.length > 0 && selectedRisks.length === filteredRisks.length}
                                    indeterminate={selectedRisks.length > 0 && selectedRisks.length < filteredRisks.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    sx={{ color: alpha('#fff', 0.2), '&.Mui-checked': { color: '#6366f1' } }}
                                />
                            </TableCell>
                            <TableCell>INTEL STATEMENT</TableCell>
                            <TableCell>TAXONOMY</TableCell>
                            <TableCell align="center">STATUS</TableCell>
                            <TableCell align="center">QUANT SCORE</TableCell>
                            <TableCell>STATE</TableCell>
                            <TableCell align="right">ACTION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <AnimatePresence>
                            {filteredRisks.map((row: any, idx: number) => {
                                const originalIdx = aiDetailedAnalysis.indexOf(row);
                                const decision = finalDecisions.row_decisions[originalIdx]?.accepted;
                                const aiData = row.ai_analysis || {};
                                const aiScore = (aiData.score_analysis?.suggested_impact || 0) * (aiData.score_analysis?.suggested_likelihood || 0);
                                const originalScore = (row.original_data.impact || 0) * (row.original_data.likelihood || 0);
                                const score = aiScore > 0 ? aiScore : originalScore;

                                return (
                                    <TableRow
                                        key={idx}
                                        component={motion.tr}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: (idx % 20) * 0.02 }}
                                        hover
                                        selected={selectedRisks.includes(idx)}
                                        onClick={() => handleRowClick(originalIdx)}
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: alpha('#fff', 0.015),
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                bgcolor: alpha('#6366f1', 0.05) + ' !important',
                                                transform: 'scale(1.002)',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                            },
                                            '&.Mui-selected': {
                                                bgcolor: alpha('#6366f1', 0.1) + ' !important',
                                            },
                                            '& td': {
                                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                py: 1, px: 2,
                                                borderColor: 'transparent',
                                                firstOfType: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
                                                lastOfType: { borderTopRightRadius: 10, borderBottomRightRadius: 10 }
                                            }
                                        }}
                                    >
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                size="small"
                                                checked={selectedRisks.includes(idx)}
                                                onChange={() => handleSelectRisk(idx)}
                                                sx={{ color: alpha('#fff', 0.2), '&.Mui-checked': { color: '#6366f1' } }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 450 }}>
                                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                {aiData.improved_statement ? (
                                                    <Box sx={{ position: 'relative' }}>
                                                        <Box sx={{
                                                            width: 24, height: 24, borderRadius: '6px',
                                                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: '1px solid rgba(139, 92, 246, 0.3)'
                                                        }}>
                                                            <Zap size={14} style={{ color: '#8b5cf6' }} />
                                                        </Box>
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                            style={{
                                                                position: 'absolute', top: -4, right: -4,
                                                                width: 6, height: 6, borderRadius: '50%',
                                                                background: '#8b5cf6', boxShadow: '0 0 10px #8b5cf6'
                                                            }}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <FileSpreadsheet size={18} style={{ color: alpha('#fff', 0.3) }} />
                                                )}
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                                                    {aiData.improved_statement || row.original_data.statement}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                {aiData.suggested_category || row.original_data.category}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {getDuplicateInfo(row.row_index) && (
                                                <Tooltip title={`Potential Duplicate: ${getDuplicateInfo(row.row_index).reason}`}>
                                                    <Chip
                                                        label="DUP"
                                                        size="small"
                                                        sx={{
                                                            height: 18, fontSize: '0.65rem', fontWeight: 900,
                                                            bgcolor: alpha('#f43f5e', 0.15), color: '#f43f5e',
                                                            border: '1px solid rgba(244, 63, 94, 0.3)',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{
                                                display: 'inline-flex', px: 1, py: 0.5, borderRadius: '6px',
                                                bgcolor: alpha(getScoreColor(score), 0.15),
                                                color: getScoreColor(score),
                                                fontWeight: 800, fontSize: '0.75rem',
                                                border: `1px solid ${alpha(getScoreColor(score), 0.3)}`,
                                                textShadow: `0 0 10px ${alpha(getScoreColor(score), 0.4)}`,
                                                minWidth: 32, justifyContent: 'center'
                                            }}>
                                                {score}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {decision === undefined && (
                                                <Box sx={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.2,
                                                    borderRadius: '4px', border: '1px dotted rgba(255,180,0,0.3)', color: '#fbbf24'
                                                }}>
                                                    <RotateCcw size={12} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Review</Typography>
                                                </Box>
                                            )}
                                            {decision === true && (
                                                <Box sx={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.2,
                                                    borderRadius: '4px', bgcolor: alpha('#22c55e', 0.1), color: '#22c55e',
                                                    border: '1px solid rgba(34, 197, 94, 0.2)'
                                                }}>
                                                    <Check size={12} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Merged</Typography>
                                                </Box>
                                            )}
                                            {decision === false && (
                                                <Box sx={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.2,
                                                    borderRadius: '4px', bgcolor: alpha('#ef4444', 0.1), color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                                }}>
                                                    <X size={12} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Omit</Typography>
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" sx={{ color: alpha('#fff', 0.2) }}>
                                                <MoreVertical size={16} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* 3. Details Dialog */}
            <Dialog
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                TransitionComponent={Transition}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        bgcolor: '#0f172a',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
                    }
                }}
                BackdropProps={{
                    sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.4)' }
                }}
            >
                {currentRisk && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                        {/* Header */}
                        <Box sx={{ p: 4, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="overline" sx={{ color: '#8b5cf6', fontWeight: 800, letterSpacing: 2 }}>
                                    INTELLIGENCE UNIT R-42
                                </Typography>
                                <Typography variant="h4" fontWeight="900" sx={{ mt: 1, mb: 1, letterSpacing: '-0.02em', color: '#fff' }}>
                                    {currentRisk.ai_analysis?.improved_statement || currentRisk.original_data.statement}
                                </Typography>
                                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                    <Chip
                                        label={currentRisk.ai_analysis?.suggested_category || currentRisk.original_data.category}
                                        size="small"
                                        sx={{ bgcolor: alpha('#fff', 0.05), color: alpha('#fff', 0.6), fontWeight: 700, px: 1 }}
                                    />
                                    <Box sx={{
                                        display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: '6px',
                                        bgcolor: alpha('#6366f1', 0.1), color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)'
                                    }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800 }}>QUANT SCORE: {(currentRisk.ai_analysis?.score_analysis?.suggested_impact || currentRisk.original_data.impact || 0) * (currentRisk.ai_analysis?.score_analysis?.suggested_likelihood || currentRisk.original_data.likelihood || 0)}</Typography>
                                    </Box>
                                    {getDuplicateInfo(currentRisk.row_index) && (
                                        <Box sx={{
                                            display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: '6px',
                                            bgcolor: alpha('#f43f5e', 0.1), color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)'
                                        }}>
                                            <AlertTriangle size={14} />
                                            <Typography variant="caption" sx={{ fontWeight: 800 }}>DUPLICATE DETECTED</Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)} sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                <X size={20} color="white" />
                            </IconButton>
                        </Box>

                        <DialogContent sx={{ p: 4 }}>
                            <Stack spacing={4}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.4), mb: 2, fontWeight: 800, letterSpacing: '0.05em' }}>DESCRIPTION REFINEMENT</Typography>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                                        <Paper elevation={0} sx={{ flex: 1, p: 2.5, bgcolor: alpha('#fff', 0.03), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Typography variant="caption" display="block" sx={{ color: alpha('#fff', 0.3), fontWeight: 700, mb: 1 }}>ORIGINAL</Typography>
                                            <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), lineHeight: 1.6 }}>
                                                {currentRisk.original_data.description || 'No description provided.'}
                                            </Typography>
                                        </Paper>

                                        {currentRisk.ai_analysis?.improved_description && (
                                            <>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: alpha('#fff', 0.2) }}>
                                                    <ArrowRight size={20} />
                                                </Box>
                                                <Paper elevation={0} sx={{
                                                    flex: 1, p: 2.5, bgcolor: alpha('#8b5cf6', 0.05), border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 2, position: 'relative', overflow: 'hidden'
                                                }}>
                                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: '#8b5cf6' }} />
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                        <Zap size={14} style={{ color: '#8b5cf6' }} />
                                                        <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 800 }}>AI ENHANCED</Typography>
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: '#fff', lineHeight: 1.6 }}>
                                                        {currentRisk.ai_analysis.improved_description}
                                                    </Typography>
                                                </Paper>
                                            </>
                                        )}
                                    </Stack>
                                </Box>

                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.4), mb: 2, fontWeight: 800, letterSpacing: '0.05em' }}>STRATEGIC CONTEXT</Typography>
                                    {!currentRisk.ai_analysis?.score_analysis?.financial_impact_estimate && !currentRisk.ai_analysis?.score_analysis?.why_matters ? (
                                        <Alert severity="info" sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            Analysis unavailable for this item.
                                        </Alert>
                                    ) : (
                                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                            <Box flex={1}>
                                                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha('#6366f1', 0.1), color: '#6366f1', display: 'flex' }}>
                                                        <Shield size={16} />
                                                    </Box>
                                                    <Typography variant="subtitle2" fontWeight={800} color="#fff">Why It Matters</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.6 }}>
                                                    {currentRisk.ai_analysis.score_analysis.why_matters}
                                                </Typography>
                                            </Box>
                                            <Box flex={1}>
                                                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', display: 'flex' }}>
                                                        <BarChart3 size={16} />
                                                    </Box>
                                                    <Typography variant="subtitle2" fontWeight={800} color="#fff">Estimated Impact</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.6 }}>
                                                    {currentRisk.ai_analysis.score_analysis.financial_impact_estimate}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    )}
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 4, borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <Button
                                onClick={() => setDrawerOpen(false)}
                                sx={{ color: alpha('#fff', 0.4), fontWeight: 700, textTransform: 'none' }}
                            >
                                Dismiss
                            </Button>

                            <Stack direction="row" spacing={2}>
                                {currentDecision === undefined ? (
                                    <>
                                        <Button
                                            variant="outlined"
                                            startIcon={<XCircle size={18} />}
                                            onClick={() => {
                                                setFinalDecisions({
                                                    ...finalDecisions,
                                                    row_decisions: { ...finalDecisions.row_decisions, [drawerRiskIndex!]: { accepted: false } }
                                                });
                                                setDrawerOpen(false);
                                            }}
                                            sx={{ borderRadius: '10px', px: 3, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: 700, textTransform: 'none' }}
                                        >
                                            Omit Item
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<CheckCircle2 size={18} />}
                                            onClick={() => {
                                                setFinalDecisions({
                                                    ...finalDecisions,
                                                    row_decisions: { ...finalDecisions.row_decisions, [drawerRiskIndex!]: { accepted: true } }
                                                });
                                                setDrawerOpen(false);
                                            }}
                                            sx={{
                                                borderRadius: '10px', px: 4,
                                                bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' },
                                                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.3)',
                                                fontWeight: 800, textTransform: 'none'
                                            }}
                                        >
                                            Merge Intelligence
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        startIcon={<RotateCcw size={18} />}
                                        onClick={() => {
                                            const newDecisions = { ...finalDecisions.row_decisions };
                                            delete newDecisions[drawerRiskIndex!];
                                            setFinalDecisions({ ...finalDecisions, row_decisions: newDecisions });
                                        }}
                                        sx={{ borderRadius: '10px', px: 3, color: alpha('#fff', 0.6), borderColor: 'rgba(255,255,255,0.1)', fontWeight: 700, textTransform: 'none' }}
                                    >
                                        Undo {currentDecision ? 'Acceptance' : 'Rejection'}
                                    </Button>
                                )}
                            </Stack>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default AIAnalysisDashboard;
