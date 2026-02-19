import { useState, useCallback, useEffect, useRef } from 'react';
import AIAnalysisDashboard from '../components/AIAnalysisDashboard';
import { useDropzone } from 'react-dropzone';
import {
    Box,
    Typography,
    Paper,
    Button,
    Stepper,
    Step,
    StepLabel,
    Alert,
    CircularProgress,
    LinearProgress,
    alpha,
    StepConnector,
    stepConnectorClasses,
    styled,
    useTheme
} from '@mui/material';

import {
    CloudUpload,
    CheckCircle2,
    FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { importAPI, governanceAPI, adminAPI } from '../services/api';
import * as XLSX from 'xlsx';

const steps = ['Upload', 'Analysis', 'Result'];

// Custom Minimal Stepper Connector
const QontoConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 10,
        left: 'calc(-50% + 16px)',
        right: 'calc(50% + 16px)',
    },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            borderColor: theme.palette.primary.main,
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            borderColor: theme.palette.primary.main,
        },
    },
    [`& .${stepConnectorClasses.line}`]: {
        borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
        borderTopWidth: 2,
        borderRadius: 1,
    },
}));

// Custom Minimal Step Icon
const QontoStepIconRoot = styled('div')<{ ownerState: { active?: boolean } }>(
    ({ theme, ownerState }) => ({
        color: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#eaeaf0',
        display: 'flex',
        height: 22,
        alignItems: 'center',
        ...(ownerState.active && {
            color: theme.palette.primary.main,
        }),
        '& .QontoStepIcon-circle': {
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
        },
        '& .QontoStepIcon-completedIcon': {
            color: theme.palette.primary.main,
            zIndex: 1,
            fontSize: 18,
        },
    }),
);

function QontoStepIcon(props: any) {
    const { active, completed, className } = props;

    return (
        <QontoStepIconRoot ownerState={{ active }} className={className}>
            {completed ? (
                <CheckCircle2 size={18} className="QontoStepIcon-completedIcon" />
            ) : (
                <div className="QontoStepIcon-circle" />
            )}
        </QontoStepIconRoot>
    );
}


export default function ImportExcel() {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const [, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [importResults, setImportResults] = useState<any>(null);
    const [, setIsRejected] = useState(false);

    // Progressive Loading State
    const [progress, setProgress] = useState(0);
    const [currentBatch, setCurrentBatch] = useState(0);
    const [totalBatches, setTotalBatches] = useState(0);
    const [, setPreviewRows] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);

    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'analyzing' | 'error'>('idle');

    // Advanced AI Analysis State
    const [aiDetailedAnalysis, setAiDetailedAnalysis] = useState<any[]>([]);
    const [finalDecisions, setFinalDecisions] = useState<any>({ accept_all_ai: true, row_decisions: {} });
    const [duplicateReport, setDuplicateReport] = useState<any>(null);

    // Stream Ref
    const eventSourceRef = useRef<EventSource | null>(null);
    // Ref for stream handler
    const messageHandlerRef = useRef<any>(null);

    const clearJobSession = async () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        sessionStorage.removeItem('import_job_id');
        sessionStorage.removeItem('import_active_step');
        setJobId(null);
        setActiveStep(0);
        setAiDetailedAnalysis([]);
        setProgress(0);
        setPreviewRows([]);
        setUploadProgress(0);
        setUploadStatus('idle');
        setDuplicateReport(null);

        try {
            await adminAPI.clearPendingImportJobs();
        } catch (e) {
            // Ignore
        }
    };

    // Governance State
    const [, setGovernanceLoading] = useState(false);
    const [, setGovernanceAnalysis] = useState<any>(null);

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

    const handleStreamMessage = useCallback((data: any) => {
        if (data.type === 'connected') {
            console.log('Stream connected');
        } else if (data.type === 'batch_result') {
            setAiDetailedAnalysis(prev => {
                if (!Array.isArray(data.results)) return prev;

                // Create a temporary copy of previous state
                const next = [...prev];

                data.results.forEach((newRow: any) => {
                    const existingIdx = next.findIndex(p => p.row_index === newRow.row_index);
                    if (existingIdx >= 0) {
                        // Update existing row
                        next[existingIdx] = newRow;
                    } else {
                        // Add new row
                        next.push(newRow);
                    }
                });

                return next.sort((a, b) => a.row_index - b.row_index);
            });

            if (data.completedCount !== undefined) {
                if (data.totalCount) setTotalRows(data.totalCount);
                setProgress(Math.round((data.completedCount / (data.totalCount || 1)) * 100));
            } else if (data.progress !== undefined) {
                setProgress(data.progress);
            }
        } else if (data.type === 'complete') {
            setLoading(false);
            setProgress(100);
        } else if (data.type === 'error') {
            setError(data.message);
            setLoading(false);
        }
    }, [totalRows]);

    useEffect(() => {
        messageHandlerRef.current = handleStreamMessage;
    }, [handleStreamMessage]);

    const pollForResults = useCallback(async (jobId: string) => {
        const maxAttempts = 30;
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await importAPI.getJob(jobId);
                const job = response.data;

                if (job.status === 'analyzed') {
                    const analysisResp = await importAPI.getAiAnalysis(jobId);
                    setAiDetailedAnalysis(analysisResp.data.analysis_results || []);
                    setLoading(false);
                    return;
                }

                if (job.status === 'mapping') {
                    await importAPI.analyzeRisks(jobId);
                }

                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 2000);
                }
            } catch (err) {
                console.error('Polling error', err);
            }
        };
        poll();
    }, []);

    const fetchStream = useCallback(async (jobId: string) => {
        try {
            const response = await fetch(`/api/v1/import/jobs/${jobId}/stream-analysis`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                    'Accept': 'text/event-stream',
                },
            });

            if (!response.ok) throw new Error(response.statusText);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                for (const part of parts) {
                    const lines = part.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            try {
                                const data = JSON.parse(dataStr);
                                if (messageHandlerRef.current) {
                                    messageHandlerRef.current(data);
                                }
                            } catch (e) {
                                console.warn('Failed to parse SSE', e);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Stream failed', err);
            pollForResults(jobId);
        }
    }, [handleStreamMessage, pollForResults]);

    const startAnalysisStream = useCallback((jobId: string) => {
        if (!jobId) return;
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setLoading(true);
        setActiveStep(1);
        fetchStream(jobId);
    }, [fetchStream]);

    // Always reset on page load/refresh — user must re-upload each time
    useEffect(() => {
        clearJobSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (jobId) {
            sessionStorage.setItem('import_job_id', jobId);
            sessionStorage.setItem('import_active_step', activeStep.toString());
        }
    }, [jobId, activeStep]);

    // Real-time progress polling for AI analysis
    useEffect(() => {
        if (!jobId || activeStep !== 1 || uploadStatus !== 'analyzing') {
            return;
        }

        const pollProgress = async () => {
            try {
                const response = await importAPI.getAnalysisProgress(jobId);
                const { progress: progressPercent, current_batch, total_batches, status } = response.data;

                setProgress(progressPercent);
                setCurrentBatch(current_batch);
                setTotalBatches(total_batches);

                // Stop polling when complete
                if (progressPercent >= 100 || status === 'analyzed') {
                    setUploadStatus('idle');
                    // Fetch final results
                    const analysisResp = await importAPI.getAiAnalysis(jobId);
                    setAiDetailedAnalysis(analysisResp.data.analysis_results || []);
                    setLoading(false);
                    return true; // Signal to stop polling
                }

                return false; // Continue polling
            } catch (err) {
                console.error('Progress polling error:', err);
                return false;
            }
        };

        // Initial poll
        pollProgress();

        // Set up interval polling
        const intervalId = setInterval(async () => {
            const shouldStop = await pollProgress();
            if (shouldStop) {
                clearInterval(intervalId);
            }
        }, 500);

        return () => clearInterval(intervalId);
    }, [jobId, activeStep, uploadStatus]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setLoading(true);
        setError('');
        setIsRejected(false);
        setPreviewRows([]);
        setUploadStatus('uploading');
        setUploadProgress(0);

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                if (json.length > 0) {
                    setTotalRows(json.length - 1); // minus header
                    setPreviewRows(json.slice(0, 6));
                }
            } catch (err) {
                console.error("Preview parse failed", err);
            }
        };
        reader.readAsBinaryString(file);

        try {
            const response = await importAPI.upload(file, (progress) => {
                setUploadProgress(progress);
            });
            const { job_id } = response.data;
            setJobId(job_id);
            setUploadStatus('processing');
            setLoading(true);

            // Wait for mapping
            const waitForMapping = async () => {
                let attempts = 0;
                while (attempts < 300) {
                    const jobResp = await importAPI.getJob(job_id);
                    if (jobResp.data.status === 'mapping') {
                        return jobResp.data;
                    }
                    if (jobResp.data.status === 'failed') {
                        const errorLog = jobResp.data.error_log;
                        const detailedError = Array.isArray(errorLog) && errorLog.length > 0
                            ? (errorLog[0].details || errorLog[0].error || 'Processing failed')
                            : 'Processing failed';
                        throw new Error(detailedError);
                    }
                    await new Promise(r => setTimeout(r, 1000));
                    attempts++;
                }
                throw new Error('Timeout waiting for AI mapping');
            };

            const jobData = await waitForMapping();
            const mappings = jobData.ai_mapping_suggestions || [];
            if (jobData.duplicate_report) setDuplicateReport(jobData.duplicate_report);

            await importAPI.confirmMapping(job_id, {
                column_mappings: mappings,
                merge_decisions: {}
            });

            await importAPI.analyzeRisks(job_id);
            setUploadStatus('analyzing');
            startAnalysisStream(job_id);

        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Upload failed');
            setUploadStatus('error');
            setLoading(false);
        }
    }, [startAnalysisStream]);

    const handleFinalize = async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            const transformedDecisions = {
                accept_all_ai: finalDecisions.accept_all_ai,
                row_decisions: Object.entries(finalDecisions.row_decisions || {}).reduce((acc: any, [key, val]: any) => {
                    const decision = val.accepted ? 'ai' : 'original';
                    acc[`row_${key}`] = decision;
                    return acc;
                }, {})
            };

            await importAPI.finalizeImport(jobId, { final_decisions: transformedDecisions });
            const pollFinal = async () => {
                const res = await importAPI.getJob(jobId);
                if (res.data.status === 'completed') {
                    const resultsResp = await importAPI.getResults(jobId);
                    setImportResults(resultsResp.data);
                    setActiveStep(2);
                    setLoading(false);
                    runGovernanceCheck();
                } else if (res.data.status === 'failed') {
                    setError('Finalization failed');
                    setLoading(false);
                } else {
                    setTimeout(pollFinal, 1000);
                }
            };
            pollFinal();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to finalize import');
            setLoading(false);
        }
    };


    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
    });

    return (
        <Box sx={{ maxWidth: 1000, margin: '0 auto', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Minimal Stepper */}
            <Box mb={6}>
                <Stepper alternativeLabel activeStep={activeStep} connector={<QontoConnector />}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel StepIconComponent={QontoStepIcon}>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={clearJobSession}>Reset</Button>}>
                    {error}
                </Alert>
            )}

            {/* Step 0: Upload */}
            <AnimatePresence mode="wait">
                {activeStep === 0 && (
                    <motion.div
                        key="step0"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Paper
                            {...getRootProps()}
                            className="glass-card"
                            sx={{
                                p: 8,
                                textAlign: 'center',
                                border: '1px solid',
                                borderColor: isDragActive ? '#6366f1' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                bgcolor: isDragActive ? alpha('#6366f1', 0.05) : (theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.8)'),
                                cursor: uploadStatus === 'idle' ? 'pointer' : 'default',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isDragActive ? '0 0 40px rgba(99, 102, 241, 0.2)' : (theme.palette.mode === 'dark' ? '0 20px 40px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)'),
                                backdropFilter: 'blur(20px)',
                                '&:hover': {
                                    borderColor: uploadStatus === 'idle' ? 'rgba(99, 102, 241, 0.4)' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                    transform: uploadStatus === 'idle' ? 'translateY(-4px)' : 'none',
                                    boxShadow: uploadStatus === 'idle' ? (theme.palette.mode === 'dark' ? '0 30px 60px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)') : 'none',
                                }
                            }}
                        >
                            <input {...getInputProps()} disabled={uploadStatus !== 'idle'} />

                            {(uploadStatus !== 'idle') ? (
                                <Box sx={{ py: 4 }}>
                                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                                        <CircularProgress size={80} thickness={2} sx={{ color: '#8b5cf6' }} />
                                        <Box
                                            sx={{
                                                top: 0, left: 0, bottom: 0, right: 0,
                                                position: 'absolute', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            <Typography variant="caption" component="div" color="text.secondary" fontWeight="700">
                                                {uploadProgress}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="h5" fontWeight="800" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
                                        {uploadStatus === 'uploading' && 'Streaming to Cloud...'}
                                        {uploadStatus === 'processing' && 'Extracting Intelligence...'}
                                        {uploadStatus === 'analyzing' && 'AI Neural Processing...'}
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                                        {uploadStatus === 'uploading' && `Payload transfer in progress. Please wait.`}
                                        {uploadStatus === 'processing' && 'Our engine is parsing your risk structure...'}
                                        {uploadStatus === 'analyzing' && 'Large Language Model is identifying and improving risks...'}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: '24px',
                                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto',
                                                mb: 4,
                                                boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
                                            }}
                                        >
                                            <CloudUpload size={40} style={{ color: '#8b5cf6' }} />
                                        </Box>
                                    </motion.div>
                                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
                                        Import Risk Data
                                    </Typography>
                                    <Typography color="text.secondary" mb={5} maxWidth={500} mx="auto" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
                                        Inject your raw risk data into our AI engine. We'll automatically identify, categorize, and enhance your risk statements using Enterprise Intelligence.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<FileSpreadsheet size={20} />}
                                        sx={{
                                            borderRadius: '12px',
                                            textTransform: 'none',
                                            px: 4,
                                            py: 1.5,
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            boxShadow: '0 8px 25px -5px rgba(99, 102, 241, 0.4)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 12px 30px -5px rgba(99, 102, 241, 0.5)',
                                            }
                                        }}
                                    >
                                        Select Enterprise File
                                    </Button>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'text.disabled', fontWeight: 600 }}>
                                        SUPPORTED FORMATS: .XLSX, .CSV, .XLS
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                )}

                {/* Step 1: Analysis */}
                {activeStep === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Box>
                            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    {progress < 100 ? (
                                        <CircularProgress size={24} thickness={5} sx={{ color: '#8b5cf6' }} />
                                    ) : (
                                        <CheckCircle2 size={24} color="#22c55e" />
                                    )}
                                    <Typography variant="h5" fontWeight="800" sx={{ letterSpacing: '-0.02em' }}>
                                        AI Neural Analysis
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    px: 2, py: 0.5, borderRadius: '100px',
                                    bgcolor: alpha('#8b5cf6', 0.1),
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    color: '#a5b4fc',
                                    fontWeight: 800,
                                    fontSize: '0.9rem'
                                }}>
                                    {progress}%
                                </Box>
                            </Box>

                            {/* Linear Progress */}
                            {progress < 100 && (
                                <Box sx={{ mb: 5 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress}
                                        sx={{
                                            mb: 1.5,
                                            borderRadius: 2,
                                            height: 10,
                                            bgcolor: 'action.hover',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                                boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)'
                                            }
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Processing intelligence clusters...
                                        </Typography>
                                        <Typography variant="body2" fontWeight="800" color="primary.light">
                                            Batch {currentBatch} / {totalBatches}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {(aiDetailedAnalysis.length > 0 || (uploadStatus === 'analyzing' && progress > 0)) ? (
                                <AIAnalysisDashboard
                                    aiDetailedAnalysis={aiDetailedAnalysis}
                                    finalDecisions={finalDecisions}
                                    setFinalDecisions={setFinalDecisions}
                                    onCancel={clearJobSession}
                                    onContinue={handleFinalize}
                                    isStreaming={progress < 100}
                                    duplicateReport={duplicateReport}
                                />
                            ) : (
                                <Box textAlign="center" py={10} sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)', borderRadius: 4, border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}` }}>
                                    <CircularProgress size={40} sx={{ mb: 3, color: '#8b5cf6' }} />
                                    <Typography color="text.secondary" fontWeight="600">Initializing AI Data Stream...</Typography>
                                </Box>
                            )}
                        </Box>
                    </motion.div>
                )}

                {/* Step 2: Results */}
                {activeStep === 2 && importResults && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Paper className="glass-card" sx={{
                            p: 10,
                            textAlign: 'center',
                            background: 'radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: 6
                        }}>
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '30%',
                                    bgcolor: alpha('#22c55e', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 4,
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    boxShadow: '0 0 30px rgba(34, 197, 94, 0.2)'
                                }}
                            >
                                <CheckCircle2 size={50} style={{ color: '#22c55e' }} />
                            </Box>
                            <Typography variant="h3" fontWeight="900" gutterBottom sx={{ letterSpacing: '-0.04em' }}>
                                Injection <span style={{ color: '#22c55e' }}>Complete</span>
                            </Typography>
                            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 5, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
                                Strategic integration successful. <b>{importResults.processed_rows}</b> enterprise risks have been mapped and analyzed by our AI core.
                            </Typography>
                            <Box display="flex" justifyContent="center" gap={3}>
                                <Button
                                    variant="outlined"
                                    onClick={clearJobSession}
                                    sx={{ borderRadius: '12px', px: 4, py: 1.5, fontWeight: 700, border: `1px solid ${theme.palette.divider}` }}
                                >
                                    New Injection
                                </Button>
                                <Button
                                    variant="contained"
                                    href="/risks"
                                    sx={{
                                        borderRadius: '12px', px: 5, py: 1.5, fontWeight: 700,
                                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                        boxShadow: '0 8px 25px -5px rgba(34, 197, 94, 0.4)'
                                    }}
                                >
                                    Enter Risk Register
                                </Button>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box >
    );
}
