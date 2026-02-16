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
        <Box>
            <Typography variant="h4" gutterBottom>
                AI Document Analysis
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
                Upload any document and let AI analyze it for you. Get instant insights, summaries, and recommendations.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Upload Area */}
            {!analysis && (
                <Paper
                    {...getRootProps()}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                        cursor: 'pointer',
                        mb: 4,
                    }}
                >
                    <input {...getInputProps()} />
                    <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {isDragActive ? 'Drop the file here' : 'Drag & drop any document here'}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                        or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Supported formats: Excel (.xlsx, .xls), CSV (.csv), Text (.txt, .md)
                    </Typography>
                    {loading && (
                        <Box sx={{ mt: 3 }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 2 }}>Analyzing document with AI...</Typography>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Analysis Results */}
            {analysis && (
                <Box>
                    {/* Header Card */}
                    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="overline" sx={{ opacity: 0.9 }}>
                                        Analysis Complete
                                    </Typography>
                                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                                        {fileName}
                                    </Typography>
                                    <Chip
                                        icon={<Description />}
                                        label={analysis.document_type}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Box>
                                <CheckCircle sx={{ fontSize: 48, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>

                    <Grid container spacing={3}>
                        {/* Purpose & Summary */}
                        <Grid item xs={12} md={8}>
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                                        <Typography variant="h6">Document Purpose</Typography>
                                    </Box>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                        {analysis.purpose}
                                    </Typography>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="h6" gutterBottom>
                                        Summary
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        {analysis.summary}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Scores */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Analysis Scores
                                    </Typography>

                                    <Box sx={{ mb: 3 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Risk Relevance
                                            </Typography>
                                            <Chip
                                                label={`${analysis.risk_relevance_score}%`}
                                                color={getRelevanceColor(analysis.risk_relevance_score)}
                                                size="small"
                                            />
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">
                                                AI Confidence
                                            </Typography>
                                            <Chip
                                                label={`${analysis.confidence_score}%`}
                                                color={getConfidenceColor(analysis.confidence_score)}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>

                                    {analysis.metadata && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="subtitle2" gutterBottom>
                                                Metadata
                                            </Typography>
                                            {analysis.metadata.total_items && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Total Items: {analysis.metadata.total_items}
                                                </Typography>
                                            )}
                                            {analysis.metadata.date_range && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Date Range: {analysis.metadata.date_range}
                                                </Typography>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Key Findings */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                                        <Typography variant="h6">Key Findings</Typography>
                                    </Box>
                                    <List>
                                        {analysis.key_findings.map((finding, index) => (
                                            <ListItem key={index} sx={{ px: 0 }}>
                                                <ListItemText
                                                    primary={finding}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Suggested Actions */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <Lightbulb sx={{ mr: 1, color: 'warning.main' }} />
                                        <Typography variant="h6">Suggested Actions</Typography>
                                    </Box>
                                    {analysis.suggested_actions && analysis.suggested_actions.length > 0 ? (
                                        <List>
                                            {analysis.suggested_actions.map((action, index) => (
                                                <ListItem key={index} sx={{ px: 0 }}>
                                                    <ListItemText
                                                        primary={action}
                                                        primaryTypographyProps={{ variant: 'body2' }}
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
                    {governanceLoading && (
                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <CircularProgress size={24} sx={{ mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Verifying compliance...
                            </Typography>
                        </Box>
                    )}

                    {!governanceLoading && governanceAnalysis && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h5" gutterBottom fontWeight="bold">
                                Governance & Compliance Check
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Card variant="outlined" sx={{ borderColor: 'primary.light', bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
                                        <CardContent>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                                                AI Consistency Insights
                                            </Typography>
                                            <Typography variant="body1" paragraph>
                                                {governanceAnalysis.explanation}
                                            </Typography>

                                            {governanceAnalysis.justification_required.length > 0 && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Warning color="warning" fontSize="small" /> Attention Required
                                                    </Typography>
                                                    <List dense sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'white', borderRadius: 1 }}>
                                                        {governanceAnalysis.justification_required.map((req: string, index: number) => (
                                                            <ListItem key={index}>
                                                                <ListItemText primary={req} />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* Analyze Another Button */}
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Paper
                            onClick={() => {
                                setAnalysis(null);
                                setFileName('');
                                setError('');
                                setGovernanceAnalysis(null);
                            }}
                            sx={{
                                p: 2,
                                cursor: 'pointer',
                                border: '1px dashed',
                                borderColor: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <Typography color="primary">
                                Analyze Another Document
                            </Typography>
                        </Paper>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
