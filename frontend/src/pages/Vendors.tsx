import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Card,
    CardContent,
    Stack,
    Chip,
    CircularProgress,
    IconButton,
    TextField,
    Modal,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Alert,
    Divider,
    CardActions
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Add,
    Business,
    Assessment,
    AutoGraph,
    InfoOutlined,
    Edit,
} from '@mui/icons-material';
import { vendorAPI } from '../services/api';

interface Vendor {
    vendor_id: string;
    vendor_name: string;
    category: string;
    risk_score: number;
    criticality: string;
    status: string;
    last_assessment_at: string;
    assessment_data: any;
}

export default function Vendors() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({ vendor_name: '', category: '', criticality: 'MEDIUM' });
    const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [assessLoading, setAssessLoading] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await vendorAPI.list();
            setVendors(res.data);
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVendor = async () => {
        if (!newVendor.vendor_name) return;
        try {
            await vendorAPI.create(newVendor);
            setIsAddModalOpen(false);
            setNewVendor({ vendor_name: '', category: '', criticality: 'MEDIUM' });
            fetchVendors();
        } catch (err) {
            console.error('Failed to add vendor:', err);
        }
    };

    const handleAssessVendor = async () => {
        if (!selectedVendor) return;
        setAssessLoading(true);
        try {
            const res = await vendorAPI.assess(selectedVendor.vendor_id, {});
            // Update the local list and selected vendor with new data
            setVendors(prev => prev.map(v => v.vendor_id === selectedVendor.vendor_id ? res.data.vendor : v));
            setSelectedVendor(res.data.vendor);
        } catch (err) {
            console.error('Failed to assess vendor:', err);
        } finally {
            setAssessLoading(false);
        }
    };

    const getCriticalityColor = (crit: string) => {
        switch (crit?.toUpperCase()) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        SWOT Vendor Risk
                    </Typography>
                    <Typography color="text.secondary">
                        Manage and assess third-party risk profiles
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setIsAddModalOpen(true)}>
                    Add Vendor
                </Button>
            </Box>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3, bgcolor: 'primary.main', color: 'white' }}>
                        <CardContent>
                            <Typography variant="h6">Total Vendors</Typography>
                            <Typography variant="h3" fontWeight="bold">{vendors.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3, bgcolor: 'error.main', color: 'white' }}>
                        <CardContent>
                            <Typography variant="h6">Critical Vendors</Typography>
                            <Typography variant="h3" fontWeight="bold">
                                {vendors.filter(v => v.criticality === 'CRITICAL').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3, bgcolor: 'warning.main', color: 'white' }}>
                        <CardContent>
                            <Typography variant="h6">Avg. Risk Score</Typography>
                            <Typography variant="h3" fontWeight="bold">
                                {vendors.length > 0 ? Math.round(vendors.reduce((acc, v) => acc + (v.risk_score || 0), 0) / vendors.length) : 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: isMobile ? 'transparent' : 'background.paper', boxShadow: isMobile ? 'none' : undefined }}>
                {loading ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
                ) : isMobile ? (
                    <Stack spacing={2}>
                        {vendors.map((vendor) => (
                            <Card key={vendor.vendor_id}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Business color="action" />
                                            <Typography variant="subtitle1" fontWeight="bold">{vendor.vendor_name}</Typography>
                                        </Box>
                                        <Chip label={vendor.status} variant="outlined" size="small" />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {vendor.category}
                                    </Typography>

                                    <Grid container spacing={2} sx={{ mb: 1, mt: 0.5 }}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" display="block" color="text.secondary">Criticality</Typography>
                                            <Chip label={vendor.criticality} color={getCriticalityColor(vendor.criticality)} size="small" sx={{ mt: 0.5 }} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" display="block" color="text.secondary">Risk Score</Typography>
                                            <Typography variant="body2" fontWeight="bold" color={vendor.risk_score > 70 ? 'error.main' : 'text.primary'} sx={{ mt: 0.5 }}>
                                                {vendor.risk_score || 0}/100
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: 'flex-end' }}>
                                    <Button
                                        size="small"
                                        startIcon={<Assessment />}
                                        onClick={() => { setSelectedVendor(vendor); setIsAssessModalOpen(true); }}
                                    >
                                        Assess
                                    </Button>
                                    <Button size="small" startIcon={<Edit />}>
                                        Edit
                                    </Button>
                                </CardActions>
                            </Card>
                        ))}
                        {vendors.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                No vendors found.
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Vendor Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Criticality</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Risk Score</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vendors.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center"><Typography sx={{ my: 4 }}>No vendors found</Typography></TableCell></TableRow>
                                ) : (
                                    vendors.map((vendor) => (
                                        <TableRow key={vendor.vendor_id}>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Business color="action" />
                                                    <Typography variant="body2" fontWeight="bold">{vendor.vendor_name}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{vendor.category}</TableCell>
                                            <TableCell>
                                                <Chip label={vendor.criticality} color={getCriticalityColor(vendor.criticality)} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color={vendor.risk_score > 70 ? 'error.main' : 'text.primary'}>
                                                    {vendor.risk_score || 0}/100
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={vendor.status} variant="outlined" size="small" />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="AI SWOT Assessment">
                                                        <IconButton size="small" color="secondary" onClick={() => { setSelectedVendor(vendor); setIsAssessModalOpen(true); }}>
                                                            <Assessment fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <IconButton size="small">
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Add Vendor Modal */}
            <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>Add New Vendor</Typography>
                    <Stack spacing={3}>
                        <TextField fullWidth label="Vendor Name" value={newVendor.vendor_name} onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })} />
                        <TextField fullWidth label="Category" value={newVendor.category} onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })} />
                        <TextField
                            select
                            fullWidth
                            label="Initial Criticality"
                            value={newVendor.criticality}
                            onChange={(e) => setNewVendor({ ...newVendor, criticality: e.target.value })}
                            SelectProps={{ native: true }}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </TextField>
                        <Box display="flex" justifyContent="flex-end" gap={2}>
                            <Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleAddVendor} disabled={!newVendor.vendor_name}>Add Vendor</Button>
                        </Box>
                    </Stack>
                </Box>
            </Modal>

            {/* AI Assessment Modal */}
            <Modal open={isAssessModalOpen} onClose={() => setIsAssessModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 600, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4, maxHeight: '90vh', overflowY: 'auto'
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                        <AutoGraph color="secondary" /> AI Third-Party Assessment
                    </Typography>

                    {!selectedVendor?.assessment_data ? (
                        <>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                You are about to run an automated SWOT assessment for <strong>{selectedVendor?.vendor_name}</strong>.
                                The AI will analyze known security data and historical performance to generate a risk score.
                            </Typography>
                            <Alert icon={<InfoOutlined />} severity="info" sx={{ mb: 4, borderRadius: 2 }}>
                                This assessment uses real-time threat intelligence and compliance mapping.
                            </Alert>
                        </>
                    ) : (
                        <Box mb={3}>
                            <Alert severity={selectedVendor.criticality === 'CRITICAL' ? 'error' : selectedVendor.criticality === 'HIGH' ? 'warning' : 'success'} sx={{ mb: 2 }}>
                                <Typography fontWeight="bold">Assessment Complete</Typography>
                                Risk Score: {selectedVendor.risk_score}/100 ({selectedVendor.criticality})
                            </Alert>

                            {selectedVendor.assessment_data.findings && (
                                <Box mb={2}>
                                    <Typography variant="subtitle2" fontWeight="bold">Key Findings</Typography>
                                    <Stack spacing={1} mt={1}>
                                        {selectedVendor.assessment_data.findings.map((f: string, i: number) => (
                                            <Chip key={i} label={f} size="small" variant="outlined" />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {selectedVendor.assessment_data.threat_signals && selectedVendor.assessment_data.threat_signals.length > 0 && (
                                <Box mb={2}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="error">Threat Intelligence Signals</Typography>
                                    <Stack spacing={1} mt={1}>
                                        {selectedVendor.assessment_data.threat_signals.map((s: any, i: number) => (
                                            <Paper key={i} sx={{ p: 1, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}>
                                                <Typography variant="caption" fontWeight="bold" display="block">{s.source} ({s.severity})</Typography>
                                                <Typography variant="body2">{s.signal}</Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {selectedVendor.assessment_data.compliance_requirements && (
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold">Compliance Requirements</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedVendor.assessment_data.compliance_requirements.join(', ')}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                        <Button onClick={() => setIsAssessModalOpen(false)}>Close</Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleAssessVendor}
                            disabled={assessLoading}
                        >
                            {assessLoading ? <CircularProgress size={24} color="inherit" /> : (selectedVendor?.assessment_data ? 'Re-Assess' : 'Start AI Assessment')}
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
