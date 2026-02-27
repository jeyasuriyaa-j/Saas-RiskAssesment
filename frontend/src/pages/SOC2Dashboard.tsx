import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress
} from '@mui/material';
import { reportService, SOC2Report } from '../services/compliance-report.service';

const SOC2Dashboard: React.FC = () => {
    const [report, setReport] = useState<SOC2Report | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await reportService.getSOC2Coverage();
            setReport(data);
        } catch (err: any) {
            console.error('Failed to load SOC2 report', err);
            // Handle 404 specifically
            if (err.response && err.response.status === 404) {
                setError('SOC2 Framework not enabled or found for this tenant.');
            } else {
                setError('Failed to load SOC2 compliance report.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'AUDIT_READY':
                return <Chip label="Audit Ready" color="success" size="small" />;
            case 'IMPLEMENTED':
                return <Chip label="Implemented (No Evidence)" color="warning" size="small" />;
            case 'NOT_COVERED':
                return <Chip label="Not Covered" color="error" size="small" />;
            default:
                return <Chip label={status} size="small" />;
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                SWOT SOC2 Dashboard
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : report ? (
                <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={12} md={3}>
                                    <Typography variant="subtitle2" color="textSecondary">Coverage</Typography>
                                    <Typography variant="h3">{Math.round(report.summary.coverage_percent)}%</Typography>
                                </Grid>
                                <Grid item xs={12} md={9}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        <LinearProgress variant="determinate" value={report.summary.coverage_percent} sx={{ height: 10, borderRadius: 5 }} />
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mt={1}>
                                        <Typography variant="body2">
                                            <strong>{report.summary.covered_criteria}</strong> / {report.summary.total_criteria} Criteria Covered
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>{report.summary.fully_auditable}</strong> Ready for Audit (Has Evidence)
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Detailed Table */}
                    <Grid item xs={12}>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Criteria</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell align="center">Mapped Risks</TableCell>
                                        <TableCell align="center">Controls</TableCell>
                                        <TableCell align="center">Evidence Items</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.details.map((row) => (
                                        <TableRow key={row.criteria}>
                                            <TableCell component="th" scope="row">
                                                <strong>{row.criteria}</strong>
                                            </TableCell>
                                            <TableCell>{row.description}</TableCell>
                                            <TableCell align="center">{row.mapped_risks_count}</TableCell>
                                            <TableCell align="center">{row.mapped_controls_count}</TableCell>
                                            <TableCell align="center">{row.evidence_count}</TableCell>
                                            <TableCell align="center">{getStatusChip(row.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            ) : null}
        </Container>
    );
};

export default SOC2Dashboard;
