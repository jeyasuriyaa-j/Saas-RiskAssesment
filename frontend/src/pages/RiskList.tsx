import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    TextField,
    InputAdornment,
    Checkbox,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    useTheme,
    Tooltip,
    Fade,
    alpha,
    Tabs,
    Tab,
    Avatar,
    Stack,
    Divider,
    Menu,
    MenuItem,
    ListItemText,
    useMediaQuery,
    Card,
    CardContent,
    Grid,
    Chip,
    Dialog,
    DialogContent,
    DialogActions,
    Grow
} from '@mui/material';
import {
    Plus,
    Search,
    CheckCircle2,
    Trash2,
    Filter,
    SlidersHorizontal,
    MoreVertical,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { riskAPI } from '../services/api';
import RiskDetail from './RiskDetail';
import { useAuth } from '../contexts/AuthContext';

interface Risk {
    risk_id: string;
    risk_code: string;
    statement: string;
    description: string;
    status: string;
    priority: string;
    inherent_risk_score: number;
    likelihood_score: number;
    impact_score: number;
    category_name: string;
    owner_name: string;
    owner_user_id?: string;
    department?: string;
    department_id?: string;
    ai_suggested_mitigation?: string;
    ai_confidence_score?: number;
    created_at?: string;
}


export default function RiskList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const navigate = useNavigate();

    // RESTRICT ACCESS: Redirect standard users to dashboard
    useEffect(() => {
        if (user && user.role === 'user') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const [risks, setRisks] = useState<Risk[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentTab, setCurrentTab] = useState(0); // 0: All, 1: My Dept, 2: Assigned
    const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
    const [anchorElFilter, setAnchorElFilter] = useState<null | HTMLElement>(null);
    const [anchorElSort, setAnchorElSort] = useState<null | HTMLElement>(null);
    const [sortBy, setSortBy] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
    const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');

    // Drawer State (Kept for 'new' risk creation if needed, but navigation preferred)
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewingRiskId, setViewingRiskId] = useState<string | null>(null);

    // Row action state
    const [anchorElRow, setAnchorElRow] = useState<null | HTMLElement>(null);
    const [activeRisk, setActiveRisk] = useState<Risk | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Permission Check
    const role = user?.role?.toLowerCase();
    const isAdmin = role === 'admin' || role === 'risk_manager';
    const isAuditorOrViewer = role === 'auditor' || role === 'viewer';
    const canViewAll = isAdmin || isAuditorOrViewer;
    const canManageRisks = isAdmin;

    const loadRisks = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = search ? { search } : {};
            if (currentTab === 2) {
                params.assigned_to_me = true;
            }
            const response = await riskAPI.list(params);
            const risksData = response.data.risks || response.data.data || [];
            setRisks(Array.isArray(risksData) ? risksData : []);
        } catch (error: any) {
            console.error('Failed to load risks:', error);
        } finally {
            setLoading(false);
        }
    }, [search, currentTab]); // Added search and currentTab as dependencies for loadRisks

    useEffect(() => {
        loadRisks();
    }, [loadRisks]); // Added loadRisks to dependency array

    // Ensure we reload when tab changes - this is now redundant with loadRisks in useEffect[loadRisks]
    // but we can keep it for clarity if needed, or remove it. Let's update it.
    useEffect(() => {
        loadRisks();
    }, [loadRisks]);


    const filteredRisks = useMemo(() => {
        let result = Array.isArray(risks) ? [...risks] : [];

        // Tab Filtering
        if (currentTab === 1) { // My Department
            result = result.filter(r =>
                // @ts-ignore
                ((user as any)?.departmentId && r.department_id === (user as any)?.departmentId) ||
                r.department === (user as any)?.department // fallback
            );
        }
        // currentTab === 2 (Assigned to Me) is handled by the backend during loadRisks

        // Search
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(r =>
                r.statement?.toLowerCase().includes(lowerSearch) ||
                r.risk_code?.toLowerCase().includes(lowerSearch)
            );
        }

        // Additional Filters
        if (filterCategory !== 'ALL') {
            result = result.filter(r => r.category_name === filterCategory);
        }
        if (filterSeverity !== 'ALL') {
            result = result.filter(r => r.priority === filterSeverity);
        }
        if (filterDepartment !== 'ALL') {
            result = result.filter(r => r.department === filterDepartment || r.department_id === filterDepartment);
        }

        // Status Filtering
        if (filterStatus === 'ACTIVE') {
            result = result.filter(r => r.status !== 'CLOSED');
        } else if (filterStatus === 'CLOSED') {
            result = result.filter(r => r.status === 'CLOSED');
        }

        // Sorting
        result.sort((a, b) => {
            let valA = (a as any)[sortBy];
            let valB = (b as any)[sortBy];

            if (valA === valB) return 0;
            const factor = sortOrder === 'asc' ? 1 : -1;
            return valA > valB ? factor : -factor;
        });

        return result;
    }, [risks, currentTab, search, user, filterCategory, filterSeverity, filterDepartment, filterStatus, sortBy, sortOrder]);

    const handleSelectRisk = (riskId: string) => {
        setSelectedRisks(prev =>
            prev.includes(riskId)
                ? prev.filter(id => id !== riskId)
                : [...prev, riskId]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRisks(filteredRisks.map(r => r.risk_id));
        } else {
            setSelectedRisks([]);
        }
    };

    const handleRowClick = (id: string) => {
        setViewingRiskId(id);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setViewingRiskId(null);
        loadRisks(); // Refresh to catch changes
    };

    // const getPriorityColor = (priority: string) => {
    //     switch (priority?.toLowerCase()) {
    //         case 'critical': return theme.palette.error.main;
    //         case 'high': return theme.palette.warning.main;
    //         case 'medium': return theme.palette.info.main;
    //         case 'low': return theme.palette.success.main;
    //         default: return theme.palette.text.secondary;
    //     }
    // };

    const getRiskScoreColor = (score: number) => {
        if (!score) return theme.palette.text.secondary;
        if (score >= 15) return theme.palette.error.main;
        if (score >= 10) return theme.palette.warning.main;
        if (score >= 5) return theme.palette.info.main;
        return theme.palette.success.main;
    };

    const getStatusStyle = (status: string) => {
        const s = status?.toUpperCase();
        switch (s) {
            case 'IDENTIFIED':
                return {
                    bg: alpha(theme.palette.info.main, 0.1),
                    text: theme.palette.info.main,
                    border: alpha(theme.palette.info.main, 0.2),
                    glow: theme.palette.mode === 'dark' ? theme.palette.info.main : 'none'
                };
            case 'ASSESSED':
                return {
                    bg: alpha(theme.palette.primary.main, 0.1),
                    text: theme.palette.primary.main,
                    border: alpha(theme.palette.primary.main, 0.2),
                    glow: theme.palette.mode === 'dark' ? theme.palette.primary.main : 'none'
                };
            case 'IN_PROGRESS':
                return {
                    bg: alpha(theme.palette.warning.main, 0.1),
                    text: theme.palette.warning.main,
                    border: alpha(theme.palette.warning.main, 0.2),
                    glow: theme.palette.mode === 'dark' ? theme.palette.warning.main : 'none'
                };
            case 'MITIGATED':
            case 'ACTIVE':
                return {
                    bg: alpha(theme.palette.success.main, 0.1),
                    text: theme.palette.success.main,
                    border: alpha(theme.palette.success.main, 0.2),
                    glow: theme.palette.mode === 'dark' ? theme.palette.success.main : 'none'
                };
            case 'CLOSED':
                return {
                    bg: alpha(theme.palette.text.disabled, 0.1),
                    text: theme.palette.text.secondary,
                    border: alpha(theme.palette.text.disabled, 0.2),
                    glow: 'none'
                };
            default:
                return {
                    bg: theme.palette.action.hover,
                    text: theme.palette.text.secondary,
                    border: theme.palette.divider,
                    glow: 'none'
                };
        }
    };

    const getStatusColor = (status: string) => getStatusStyle(status).text;

    const handleBulkApprove = async () => {
        if (selectedRisks.length === 0) return;
        try {
            // In a real app, we'd have a bulk update endpoint
            // For now, we'll just mock it or if there's a bulk update, use it.
            // Since we don't have bulk update in api.ts, we'll alert and clear.
            alert(`Approving ${selectedRisks.length} risks...`);
            // await riskAPI.bulkUpdate(selectedRisks, { status: 'ASSESSED' });
            setSelectedRisks([]);
            loadRisks();
        } catch (error) {
            console.error('Bulk approve failed:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRisks.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedRisks.length} selected risks?`)) return;

        try {
            await riskAPI.bulkDelete(selectedRisks);
            setSelectedRisks([]);
            loadRisks();
        } catch (error) {
            console.error('Bulk delete failed:', error);
            alert('Failed to delete some risks.');
        }
    };

    const handleDeleteRisk = async (permanent: boolean = false) => {
        if (!activeRisk) return;
        setDeleteLoading(true);
        try {
            await riskAPI.delete(activeRisk.risk_id, permanent);
            setOpenDeleteDialog(false);
            setActiveRisk(null);
            loadRisks();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete risk.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleOpenRowMenu = (event: React.MouseEvent<HTMLElement>, risk: Risk) => {
        event.stopPropagation();
        setAnchorElRow(event.currentTarget);
        setActiveRisk(risk);
    };

    const handleCloseRowMenu = () => {
        setAnchorElRow(null);
    };

    return (
        <Box sx={{
            height: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 1.5,
            bgcolor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Sticky Header Section */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                bgcolor: theme.palette.mode === 'light' ? '#f1f5f9' : '#020617', // Match InteractiveBackground
                pb: 1,
                mx: -1.5,
                px: 2.5,
                pt: 1,
            }}>
                {/* Header Area */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Box>
                            <Typography variant="h4" fontWeight="800" sx={{
                                color: 'text.primary',
                                letterSpacing: '-0.02em',
                                fontSize: '2rem'
                            }}>
                                Risk Register
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 600 }}>
                                {filteredRisks.length} active risks portfolio • {filteredRisks.filter(r => r.priority === 'CRITICAL').length} critical items
                            </Typography>
                        </Box>
                    </motion.div>
                    {canManageRisks && (
                        <Button
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => {
                                setViewingRiskId('new');
                                setDrawerOpen(true);
                            }}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                px: isMobile ? 2 : 3,
                                py: 1,
                                fontWeight: 700,
                            }}
                        >
                            {isMobile ? 'Add' : 'Add Risk'}
                        </Button>
                    )}
                </Box>

                {/* Glass Control Panel */}
                <Paper elevation={0} sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 2,
                    background: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.2) : theme.palette.background.paper,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    borderRadius: '14px',
                }}>
                    <Tabs
                        value={currentTab}
                        variant={isMobile ? "fullWidth" : "standard"}
                        onChange={(_, v) => setCurrentTab(v)}
                        sx={{
                            minHeight: 36,
                            width: isMobile ? '100%' : 'auto',
                            '& .MuiTabs-indicator': { display: 'none' },
                            '& .MuiTab-root': {
                                minHeight: 36,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '10px',
                                minWidth: 'auto',
                                px: 2,
                                mr: isMobile ? 0 : 1,
                                color: 'text.secondary',
                                '&.Mui-selected': {
                                    color: 'text.primary',
                                    bgcolor: alpha(theme.palette.text.primary, 0.08),
                                },
                            }
                        }}
                    >
                        <Tab label={isMobile ? "All" : "All Risks"} disabled={!canViewAll} />
                        <Tab label={isMobile ? "Dept" : "Department"} />
                        <Tab label={isMobile ? "Mine" : "Assigned"} />
                    </Tabs>

                    {!isMobile && <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />}

                    <TextField
                        placeholder={isMobile ? "Search..." : "Search risks..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        fullWidth={isMobile}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={16} style={{ color: theme.palette.text.secondary }} />
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: '12px',
                                bgcolor: theme.palette.action.hover,
                                '& fieldset': { border: 'none' },
                                fontSize: '0.875rem',
                                color: 'text.primary',
                                transition: 'all 0.2s ease'
                            }
                        }}
                        sx={{ width: isMobile ? '100%' : 320 }}
                    />

                    {!isMobile && <Box flexGrow={1} />}

                    <Stack direction="row" spacing={1} sx={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        <Tooltip title="Filters">
                            <IconButton
                                size="small"
                                onClick={(e) => setAnchorElFilter(e.currentTarget)}
                                sx={{
                                    bgcolor: filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterDepartment !== 'ALL' || filterStatus !== 'ACTIVE' ? alpha('#6366f1', 0.15) : alpha(theme.palette.text.primary, 0.04),
                                    border: `1px solid ${filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterDepartment !== 'ALL' || filterStatus !== 'ACTIVE' ? alpha('#6366f1', 0.3) : alpha(theme.palette.divider, 0.5)}`,
                                    borderRadius: '10px',
                                    color: filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterDepartment !== 'ALL' || filterStatus !== 'ACTIVE' ? '#818cf8' : 'text.secondary'
                                }}
                            >
                                <Filter size={18} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Sort">
                            <IconButton
                                size="small"
                                onClick={(e) => setAnchorElSort(e.currentTarget)}
                                sx={{
                                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    borderRadius: '10px',
                                    color: 'text.secondary',
                                    p: 1
                                }}
                            >
                                <SlidersHorizontal size={18} />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {/* Clear Filters Button (Visible if any filter is active or search exists) */}
                    {(filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterDepartment !== 'ALL' || filterStatus !== 'ACTIVE' || search) && (
                        <Button
                            size="small"
                            onClick={() => {
                                setFilterCategory('ALL');
                                setFilterSeverity('ALL');
                                setFilterDepartment('ALL');
                                setFilterStatus('ACTIVE');
                                setSearch('');
                                if (canViewAll) setCurrentTab(0);
                            }}
                            sx={{ ml: 1, textTransform: 'none', color: 'text.secondary' }}
                        >
                            Clear Filters
                        </Button>
                    )}

                    {/* Filter Menu */}
                    <Menu
                        anchorEl={anchorElFilter}
                        open={Boolean(anchorElFilter)}
                        onClose={() => setAnchorElFilter(null)}
                        PaperProps={{
                            sx: {
                                bgcolor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '12px',
                                minWidth: 180,
                                mt: 1
                            }
                        }}
                    >
                        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>Severity</Typography>
                        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                            <MenuItem
                                key={s}
                                onClick={() => { setFilterSeverity(s); setAnchorElFilter(null); }}
                                selected={filterSeverity === s}
                            >
                                <ListItemText primary={s === 'ALL' ? 'All Severities' : s} />
                            </MenuItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>Department</Typography>
                        {['ALL', ...Array.from(new Set(risks.filter(r => r.department).map(r => r.department)))].map(d => (
                            <MenuItem
                                key={d}
                                onClick={() => { setFilterDepartment(d!); setAnchorElFilter(null); }}
                                selected={filterDepartment === d}
                            >
                                <ListItemText primary={d === 'ALL' ? 'All Departments' : d} />
                            </MenuItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>Status</Typography>
                        {[
                            { id: 'ACTIVE', label: 'Active Risks' },
                            { id: 'CLOSED', label: 'Closed Risks' },
                            { id: 'ALL', label: 'All Statuses' }
                        ].map(s => (
                            <MenuItem
                                key={s.id}
                                onClick={() => { setFilterStatus(s.id); setAnchorElFilter(null); }}
                                selected={filterStatus === s.id}
                            >
                                <ListItemText primary={s.label} />
                            </MenuItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <MenuItem onClick={() => { setFilterCategory('ALL'); setFilterSeverity('ALL'); setFilterDepartment('ALL'); setFilterStatus('ACTIVE'); setAnchorElFilter(null); }}>
                            <ListItemText primary="Reset Filters" primaryTypographyProps={{ color: 'error' }} />
                        </MenuItem>
                    </Menu>

                    {/* Sort Menu */}
                    <Menu
                        anchorEl={anchorElSort}
                        open={Boolean(anchorElSort)}
                        onClose={() => setAnchorElSort(null)}
                        PaperProps={{
                            sx: {
                                bgcolor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '12px',
                                minWidth: 180,
                                mt: 1
                            }
                        }}
                    >
                        {[
                            { id: 'created_at', label: 'Recently Created' },
                            { id: 'inherent_risk_score', label: 'Risk Score' },
                            { id: 'statement', label: 'Risk Statement' },
                            { id: 'priority', label: 'Severity' }
                        ].map(s => (
                            <MenuItem
                                key={s.id}
                                onClick={() => {
                                    if (sortBy === s.id) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                    else { setSortBy(s.id); setSortOrder('desc'); }
                                    setAnchorElSort(null);
                                }}
                                selected={sortBy === s.id}
                            >
                                <ListItemText primary={s.label} />
                                {sortBy === s.id && (
                                    <Typography variant="caption" sx={{ ml: 1, color: '#6366f1' }}>
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </Typography>
                                )}
                            </MenuItem>
                        ))}
                    </Menu>
                </Paper>
            </Box>

            {isMobile ? (
                <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
                    {loading ? (
                        <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>Loading risks...</Box>
                    ) : filteredRisks.length === 0 ? (
                        <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>No risks identified.</Box>
                    ) : (
                        <Grid container spacing={2}>
                            {filteredRisks.map((risk) => (
                                <Grid item xs={12} key={risk.risk_id}>
                                    <Card
                                        sx={{
                                            background: 'background.paper',
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderRadius: 3
                                        }}
                                        onClick={() => handleRowClick(risk.risk_id)}
                                    >
                                        <CardContent>
                                            <Stack spacing={2}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                        {risk.risk_code}
                                                    </Typography>
                                                    <Box sx={{
                                                        px: 1, py: 0.2, borderRadius: 1,
                                                        fontSize: '0.7rem', fontWeight: 800,
                                                        bgcolor: getRiskScoreColor(risk.inherent_risk_score) + '20',
                                                        color: getRiskScoreColor(risk.inherent_risk_score),
                                                        border: `1px solid ${getRiskScoreColor(risk.inherent_risk_score)}30`
                                                    }}>
                                                        Score: {risk.inherent_risk_score?.toFixed(1)}
                                                    </Box>
                                                </Box>
                                                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                                    {risk.statement}
                                                </Typography>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem' }}>{risk.owner_name?.charAt(0)}</Avatar>
                                                        <Typography variant="caption" color="text.secondary">{risk.department}</Typography>
                                                    </Stack>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Chip
                                                            label={risk.priority}
                                                            size="small"
                                                            sx={{
                                                                height: 20, fontSize: '0.65rem', fontWeight: 700,
                                                                bgcolor: alpha('#fff', 0.05), border: '1px solid rgba(255,255,255,0.1)'
                                                            }}
                                                        />
                                                        <Chip
                                                            label={risk.status}
                                                            size="small"
                                                            sx={{
                                                                height: 20, fontSize: '0.65rem', fontWeight: 700,
                                                                bgcolor: getStatusColor(risk.status) + '20',
                                                                color: getStatusColor(risk.status)
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            ) : (
                <TableContainer sx={{
                    flexGrow: 1,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    overflow: 'auto',
                    mx: 0,
                    mb: 0,
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { background: alpha(theme.palette.text.primary, 0.15), borderRadius: 10 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' }
                }}>
                    <Table stickyHeader size="small">
                        <TableHead sx={{
                            '& .MuiTableCell-head': {
                                bgcolor: theme.palette.mode === 'light' ? '#f1f5f9' : '#020617',
                                zIndex: 11,
                                height: 50,
                            }
                        }}>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        indeterminate={selectedRisks.length > 0 && selectedRisks.length < filteredRisks.length}
                                        checked={filteredRisks.length > 0 && selectedRisks.length === filteredRisks.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                                    />
                                </TableCell>
                                <TableCell>ID</TableCell>
                                <TableCell>Risk Statement</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Score</TableCell>
                                <TableCell align="center" sx={{ width: 60 }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 10, color: 'text.secondary' }}>Loading risks...</TableCell></TableRow>
                            ) : filteredRisks.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 10, color: 'text.secondary' }}>No risks identified.</TableCell></TableRow>
                            ) : (
                                <AnimatePresence>
                                    {filteredRisks.map((risk) => (
                                        <TableRow
                                            component={motion.tr}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            key={risk.risk_id}
                                            hover
                                            onClick={() => handleRowClick(risk.risk_id)}
                                            sx={{
                                                cursor: 'pointer',
                                                height: 48,
                                                '& td': {
                                                    py: 1, px: 2,
                                                    fontSize: '0.875rem'
                                                }
                                            }}
                                        >
                                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    size="small"
                                                    checked={selectedRisks.includes(risk.risk_id)}
                                                    onChange={() => handleSelectRisk(risk.risk_id)}
                                                    sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                                                {risk.risk_code}
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.primary', fontWeight: 600, maxWidth: 350 }}>
                                                {risk.statement}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                    {risk.department || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar sx={{
                                                        width: 24, height: 24, fontSize: '0.7rem',
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}>
                                                        {risk.owner_name?.charAt(0)}
                                                    </Avatar>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 500 }}>
                                                        {risk.owner_name?.split(' ')[0]}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const p = risk.priority?.toUpperCase();
                                                    const colors: any = {
                                                        CRITICAL: theme.palette.error.main,
                                                        HIGH: theme.palette.warning.main,
                                                        MEDIUM: theme.palette.info.main,
                                                        LOW: theme.palette.primary.main
                                                    };
                                                    return (
                                                        <Box sx={{
                                                            display: 'inline-flex', px: 1.2, py: 0.3, borderRadius: '6px',
                                                            fontSize: '0.75rem', fontWeight: 800,
                                                            bgcolor: alpha(colors[p] || '#94a3b8', 0.1),
                                                            color: colors[p] || '#94a3b8',
                                                            border: `1px solid ${alpha(colors[p] || '#94a3b8', 0.2)}`,
                                                            letterSpacing: '0.02em'
                                                        }}>
                                                            {p}
                                                        </Box>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const style = getStatusStyle(risk.status);
                                                    return (
                                                        <Box sx={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 1,
                                                            px: 1.5, py: 0.5, borderRadius: '100px',
                                                            bgcolor: style.bg,
                                                            color: style.text,
                                                            fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                                                            border: `1px solid ${style.border}`
                                                        }}>
                                                            <Box sx={{
                                                                width: 6, height: 6, borderRadius: '50%',
                                                                bgcolor: style.text === alpha('#fff', 0.5) ? '#94a3b8' : style.text,
                                                                boxShadow: style.glow !== 'none' ? `0 0 10px ${style.glow}` : 'none'
                                                            }} />
                                                            {risk.status}
                                                        </Box>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography sx={{
                                                    color: getRiskScoreColor(risk.inherent_risk_score),
                                                    fontWeight: 800, fontSize: '1rem',
                                                    letterSpacing: '-0.01em'
                                                }}>
                                                    {risk.inherent_risk_score ? risk.inherent_risk_score.toFixed(1) : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <IconButton size="small" onClick={(e) => handleOpenRowMenu(e, risk)}>
                                                    <MoreVertical size={16} />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </AnimatePresence>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Floating Bulk Action Bar */}
            <Fade in={selectedRisks.length > 0}>
                <Paper elevation={0} sx={{
                    position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                    px: 3, py: 1.2, borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 2,
                    background: alpha(theme.palette.background.paper, 0.95), backdropFilter: 'blur(16px)',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 1100
                }}>
                    <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.875rem' }}>
                        {selectedRisks.length} Selected
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Stack direction="row" spacing={1}>
                        <Button size="small" variant="text" sx={{ color: '#22c55e', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: alpha('#22c55e', 0.1) } }} startIcon={<CheckCircle2 size={16} />} onClick={handleBulkApprove}>Approve</Button>
                        <Button size="small" variant="text" sx={{ color: '#ef4444', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: alpha('#ef4444', 0.1) } }} startIcon={<Trash2 size={16} />} onClick={handleBulkDelete}>Delete</Button>
                        <Button size="small" variant="text" sx={{ color: alpha('#fff', 0.4), textTransform: 'none' }} onClick={() => setSelectedRisks([])}>Cancel</Button>
                    </Stack>
                </Paper>
            </Fade>

            {/* Detail Drawer */}
            <Dialog
                open={drawerOpen}
                onClose={handleCloseDrawer}
                maxWidth="md"
                fullWidth
                TransitionComponent={Grow}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.paper',
                        backdropFilter: 'blur(24px)',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 4,
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }
                }}
            >
                {viewingRiskId && (
                    <Box
                        className="no-scrollbar"
                        sx={{
                            height: '100%',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { display: 'none' },
                            'scrollbarWidth': 'none'
                        }}
                    >
                        <RiskDetail riskId={viewingRiskId} onClose={handleCloseDrawer} />
                    </Box>
                )}
            </Dialog>

            {/* ROW ACTIONS MENU */}
            <Menu
                anchorEl={anchorElRow}
                open={Boolean(anchorElRow)}
                onClose={handleCloseRowMenu}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.paper',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '12px',
                        minWidth: 150,
                        mt: 0.5,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <MenuItem onClick={() => { activeRisk && handleRowClick(activeRisk.risk_id); handleCloseRowMenu(); }}>
                    <ListItemText primary="View Details" />
                </MenuItem>
                <MenuItem
                    onClick={() => { setOpenDeleteDialog(true); handleCloseRowMenu(); }}
                    sx={{ color: 'error.main' }}
                    disabled={user?.role === 'viewer' || user?.role === 'auditor'}
                >
                    <ListItemText primary="Delete Risk" />
                </MenuItem>
            </Menu>

            {/* DELETE CONFIRMATION DIALOG */}
            <Dialog open={openDeleteDialog} onClose={() => !deleteLoading && setOpenDeleteDialog(false)}>
                <header style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: '12px', color: theme.palette.error.main }}>
                    <AlertTriangle size={24} />
                    <Typography variant="h6" fontWeight="700">Confirm Deletion</Typography>
                </header>
                <DialogContent sx={{ mt: 1 }}>
                    <Typography>
                        Are you sure you want to delete risk <strong>{activeRisk?.risk_code}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Soft delete will close the risk, while permanent delete will remove it from the system.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setOpenDeleteDialog(false)} disabled={deleteLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleDeleteRisk(false)}
                        color="error"
                        variant="outlined"
                        disabled={deleteLoading}
                    >
                        Soft Delete
                    </Button>
                    {user?.role === 'admin' && (
                        <Button
                            onClick={() => handleDeleteRisk(true)}
                            color="error"
                            variant="contained"
                            disabled={deleteLoading}
                        >
                            Permanent Delete
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
