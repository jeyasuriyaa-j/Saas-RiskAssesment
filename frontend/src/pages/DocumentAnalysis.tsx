import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    Chip,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Divider,
    Grid,
    alpha,
    useTheme,
    Button,
    LinearProgress,
    Stack,
} from '@mui/material';
import {
    CloudUpload,
    Description,
    CheckCircle,
    TrendingUp,
    Lightbulb,
    Assessment,
    Warning,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { documentAPI, governanceAPI } from '../services/api';

interface DocumentAnalysisResult {
    document_type: string;
    purpose: string;
    summary: string;
    key_findings: string[];
    suggested_actions: string[];
    risk_relevance_score: number;
    confidence_score: number;
    metadata?: {
        total_items?: number;
        categories_found?: string[];
        date_range?: string;
    };
}

export default function DocumentAnalysis() {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
    const [fileName, setFileName] = useState('');

    // Governance State
    const [governanceLoading, setGovernanceLoading] = useState(false);
    const [governanceAnalysis, setGovernanceAnalysis] = useState<any>(null);

    const runGovernanceCheck = async () => {
        setGovernanceLoading(true);
        try {
            const response = await governanceAPI.analyzeDrift();
            setGovernanceAnalysis(response.data);
        } catch (err) {
            console.error('Governance check failed', err);
        } finally {
            setGovernanceLoading(false);
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setLoading(true);
        setError('');
        setAnalysis(null);
        setFileName(file.name);

        try {
            const response = await documentAPI.analyze(file);
            setAnalysis(response.data.analysis);
            setLoading(false);
            // Trigger governance check on extracted risks
            runGovernanceCheck();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to analyze document');
            setLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
            'text/plain': ['.txt'],
            'text/markdown': ['.md'],
        },
        maxFiles: 1,
    });

    const getRelevanceColor = (score: number) => {
        if (score >= 80) return 'success';
        if (score >= 50) return 'warning';
        return 'error';
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'error';
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', px: 2 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="900" gutterBottom sx={{ letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    AI Document Analysis
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: '1.1rem', opacity: 0.8 }}>
                    Upload strategy docs, audit reports, or risk registers for enterprise-grade AI decomposition.
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 4, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.1), border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`, color: 'error.light' }}>
                    {error}
                </Alert>
            )}

            <AnimatePresence mode="wait">
                {/* Upload Area */}
                {!analysis && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Paper
                            {...getRootProps()}
                            className="glass-card"
                            sx={{
                                p: 8,
                                textAlign: 'center',
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : (theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.8)'),
                                cursor: loading ? 'default' : 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                backdropFilter: 'blur(20px)',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    borderColor: loading ? 'inherit' : 'primary.main',
                                    transform: loading ? 'none' : 'translateY(-4px)',
                                    boxShadow: loading ? 'none' : (theme.palette.mode === 'dark' ? '0 30px 60px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)')
                                }
                            }}
                        >
                            <input {...getInputProps()} disabled={loading} />

                            {loading ? (
                                <Box sx={{ py: 4 }}>
                                    <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
                                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1 }}>Analyzing Intelligence Clusters...</Typography>
                                    <Typography color="text.secondary">Decomposing document structure and cross-referencing risk patterns.</Typography>
                                    <Box sx={{ width: '100%', mt: 4, maxWidth: 400, mx: 'auto' }}>
                                        <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
                                    </Box>
                                </Box>
                            ) : (
                                <Box>
                                    <Box sx={{
                                        width: 80, height: 80, borderRadius: '24px',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        mx: 'auto', mb: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                    }}>
                                        <CloudUpload sx={{ fontSize: 40, color: 'primary.main' }} />
                                    </Box>
                                    <Typography variant="h5" fontWeight="800" gutterBottom>
                                        {isDragActive ? 'Drop Knowledge Payload' : 'Select Strategy Document'}
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                                        Drag & drop your file here or click to browse. We support .xlsx, .csv, .txt, and .md formats.
                                    </Typography>
                                    <Button variant="contained" sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 700 }}>
                                        Browse Registry
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Box>
                            {/* Header Card */}
                            <Card className="glass-card" sx={{
                                mb: 4,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                border: 'none',
                                boxSizing: 'border-box'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={8}>
                                            <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800, letterSpacing: '0.1em' }}>
                                                INTELLIGENCE REPORT READY
                                            </Typography>
                                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 900, letterSpacing: '-0.03em' }}>
                                                {fileName}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Chip
                                                    icon={<Description fontSize="small" sx={{ color: 'white !important' }} />}
                                                    label={analysis.document_type}
                                                    sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, backdropFilter: 'blur(10px)' }}
                                                />
                                                <Chip
                                                    icon={<CheckCircle fontSize="small" sx={{ color: 'white !important' }} />}
                                                    label="Verified by AI Core"
                                                    sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, backdropFilter: 'blur(10px)' }}
                                                />
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                                            <Box sx={{
                                                display: 'inline-flex', p: 2, borderRadius: '50%',
                                                bgcolor: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)'
                                            }}>
                                                <Assessment sx={{ fontSize: 48 }} />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            <Grid container spacing={3}>
                                {/* Purpose & Summary */}
                                <Grid item xs={12} md={8}>
                                    <Card className="glass-card" sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Box display="flex" alignItems="center" mb={3}>
                                                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), mr: 2 }}>
                                                    <Assessment sx={{ color: 'primary.main' }} />
                                                </Box>
                                                <Typography variant="h6" fontWeight="800">Operational Purpose</Typography>
                                            </Box>
                                            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7, fontSize: '1.05rem' }}>
                                                {analysis.purpose}
                                            </Typography>

                                            <Divider sx={{ my: 3, opacity: 0.1 }} />

                                            <Typography variant="h6" fontWeight="800" sx={{ mb: 2 }}>Executive Summary</Typography>
                                            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '1.05rem' }}>
                                                {analysis.summary}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Scores & Metadata */}
                                <Grid item xs={12} md={4}>
                                    <Stack spacing={3}>
                                        <Card className="glass-card">
                                            <CardContent sx={{ p: 4 }}>
                                                <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>Analysis Confidence</Typography>

                                                <Box sx={{ mb: 4 }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                        <Typography variant="body2" fontWeight="700">Risk Relevance</Typography>
                                                        <Typography variant="body2" fontWeight="800" color={`${getRelevanceColor(analysis.risk_relevance_score)}.main`}>
                                                            {analysis.risk_relevance_score}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={analysis.risk_relevance_score}
                                                        color={getRelevanceColor(analysis.risk_relevance_score)}
                                                        sx={{ height: 8, borderRadius: 1, bgcolor: alpha(theme.palette.divider, 0.05) }}
                                                    />
                                                </Box>

                                                <Box>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                        <Typography variant="body2" fontWeight="700">AI Logic Precision</Typography>
                                                        <Typography variant="body2" fontWeight="800" color={`${getConfidenceColor(analysis.confidence_score)}.main`}>
                                                            {analysis.confidence_score}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={analysis.confidence_score}
                                                        color={getConfidenceColor(analysis.confidence_score)}
                                                        sx={{ height: 8, borderRadius: 1, bgcolor: alpha(theme.palette.divider, 0.05) }}
                                                    />
                                                </Box>
                                            </CardContent>
                                        </Card>

                                        {analysis.metadata && (
                                            <Card className="glass-card">
                                                <CardContent sx={{ p: 4 }}>
                                                    <Typography variant="subtitle1" fontWeight="800" gutterBottom>Registry Metadata</Typography>
                                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="text.secondary">Total Items</Typography>
                                                            <Typography variant="body2" fontWeight="700">{analysis.metadata.total_items || 'N/A'}</Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="text.secondary">Date Horizon</Typography>
                                                            <Typography variant="body2" fontWeight="700">{analysis.metadata.date_range || 'Unknown'}</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Categories Identified</Typography>
                                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                                {analysis.metadata.categories_found?.map((cat, i) => (
                                                                    <Chip key={i} label={cat} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Stack>
                                </Grid>

                                {/* Key Findings */}
                                <Grid item xs={12} md={6}>
                                    <Card className="glass-card" sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Box display="flex" alignItems="center" mb={3}>
                                                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.1), mr: 2 }}>
                                                    <TrendingUp sx={{ color: 'success.main' }} />
                                                </Box>
                                                <Typography variant="h6" fontWeight="800">Critical findings & Observations</Typography>
                                            </Box>
                                            <List dense>
                                                {analysis.key_findings.map((finding, index) => (
                                                    <ListItem key={index} sx={{ px: 0, py: 1.5, alignItems: 'flex-start' }}>
                                                        <Box sx={{ minWidth: 24, fontSize: '0.9rem', color: 'primary.main', fontWeight: 900, mt: 0.2 }}>{index + 1}.</Box>
                                                        <ListItemText
                                                            primary={finding}
                                                            primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.6, color: 'text.primary', fontWeight: 500 } }}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Suggested Actions */}
                                <Grid item xs={12} md={6}>
                                    <Card className="glass-card" sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Box display="flex" alignItems="center" mb={3}>
                                                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), mr: 2 }}>
                                                    <Lightbulb sx={{ color: 'warning.main' }} />
                                                </Box>
                                                <Typography variant="h6" fontWeight="800">Strategic Remediation Steps</Typography>
                                            </Box>
                                            {analysis.suggested_actions && analysis.suggested_actions.length > 0 ? (
                                                <List dense>
                                                    {analysis.suggested_actions.map((action, index) => (
                                                        <ListItem key={index} sx={{ px: 0, py: 1.5, alignItems: 'flex-start' }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', mt: 1, mr: 2 }} />
                                                            <ListItemText
                                                                primary={action}
                                                                primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.6, color: 'text.primary', fontWeight: 500 } }}
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No specific actions recommended at this time.
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Governance Analysis Section */}
                            {(governanceLoading || governanceAnalysis) && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                    <Box sx={{ mt: 6 }}>
                                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
                                            Governance & Compliance Guardrail
                                        </Typography>
                                        <Card variant="outlined" sx={{
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                                            borderRadius: 4,
                                            borderWidth: 2
                                        }}>
                                            <CardContent sx={{ p: 4 }}>
                                                {governanceLoading ? (
                                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                                        <CircularProgress size={24} sx={{ mb: 2 }} />
                                                        <Typography variant="body2" fontWeight="700">Propagating Compliance drift checks...</Typography>
                                                    </Box>
                                                ) : (
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight="800" gutterBottom color="primary">
                                                            AI Consistency & Integrity Validation
                                                        </Typography>
                                                        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, opacity: 0.9 }}>
                                                            {governanceAnalysis.explanation}
                                                        </Typography>

                                                        {governanceAnalysis.justification_required.length > 0 && (
                                                            <Box sx={{ mt: 3 }}>
                                                                <Typography variant="subtitle2" fontWeight="900" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    <Warning fontSize="small" /> Critical Divergence Detected
                                                                </Typography>
                                                                <Grid container spacing={1}>
                                                                    {governanceAnalysis.justification_required.map((req: string, index: number) => (
                                                                        <Grid item xs={12} key={index}>
                                                                            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                                                                                <Typography variant="body2" fontWeight="600">{req}</Typography>
                                                                            </Paper>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Box>
                                </motion.div>
                            )}

                            {/* Reset Button */}
                            <Box sx={{ mt: 6, mb: 10, textAlign: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setAnalysis(null);
                                        setFileName('');
                                        setError('');
                                        setGovernanceAnalysis(null);
                                    }}
                                    sx={{
                                        px: 6, py: 1.5, borderRadius: 2, fontWeight: 800,
                                        border: `2px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                                        '&:hover': {
                                            border: `2px dashed ${theme.palette.primary.main}`,
                                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}
                                >
                                    PROCESS ANOTHER KNOWLEDGE PAYLOAD
                                </Button>
                            </Box>
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}
