import { Box, Typography, Paper, Tooltip, Stack, Chip } from '@mui/material';
import { Security, Warning, Rule } from '@mui/icons-material';

const SAMPLE_NODES = {
    controls: [
        { id: 'c1', name: 'Encryption at Rest', status: 'Optimal' },
        { id: 'c2', name: 'MFA Enforcement', status: 'Designed' }
    ],
    risks: [
        { id: 'r1', name: 'Data Breach', level: 'High' },
        { id: 'r2', name: 'Unauthorized Access', level: 'Critical' }
    ],
    clauses: [
        { id: 'cl1', name: 'GDPR Art. 32', framework: 'GDPR' },
        { id: 'cl2', name: 'ISO 27001 A.12', framework: 'ISO' }
    ]
};

export default function RiskMap() {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight="bold" mb={4}>Strategic Risk Correlation Map</Typography>

            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                minHeight: 500,
                alignItems: 'center',
                px: 10
            }}>
                {/* SVG Connections (Mockup lines) */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                    <line x1="25%" y1="30%" x2="50%" y2="40%" stroke="#ccc" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="25%" y1="70%" x2="50%" y2="60%" stroke="#ccc" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="50%" y1="40%" x2="75%" y2="30%" stroke="#ccc" strokeWidth="2" strokeDasharray="5,5" />
                    <line x1="50%" y1="60%" x2="75%" y2="70%" stroke="#ccc" strokeWidth="2" strokeDasharray="5,5" />
                </svg>

                {/* Column 1: Controls */}
                <Stack spacing={4} sx={{ zIndex: 1, width: 250 }}>
                    <Typography variant="subtitle2" color="text.secondary" textAlign="center">CONTROLS</Typography>
                    {SAMPLE_NODES.controls.map(c => (
                        <Tooltip key={c.id} title={`Status: ${c.status}`}>
                            <Paper sx={{ p: 2, borderRadius: 3, borderLeft: '4px solid #4caf50', textAlign: 'center' }}>
                                <Security sx={{ color: 'success.main', mb: 1 }} />
                                <Typography variant="body2" fontWeight="bold">{c.name}</Typography>
                            </Paper>
                        </Tooltip>
                    ))}
                </Stack>

                {/* Column 2: Risks */}
                <Stack spacing={6} sx={{ zIndex: 1, width: 250 }}>
                    <Typography variant="subtitle2" color="text.secondary" textAlign="center">RISKS</Typography>
                    {SAMPLE_NODES.risks.map(r => (
                        <Paper key={r.id} sx={{ p: 3, borderRadius: '50%', width: 150, height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid', borderColor: r.level === 'Critical' ? 'error.main' : 'warning.main', mx: 'auto' }}>
                            <Warning color={r.level === 'Critical' ? 'error' : 'warning'} />
                            <Typography variant="caption" fontWeight="bold" mt={1}>{r.name}</Typography>
                            <Chip label={r.level} size="small" color={r.level === 'Critical' ? 'error' : 'warning'} sx={{ mt: 1, fontSize: '0.6rem' }} />
                        </Paper>
                    ))}
                </Stack>

                {/* Column 3: Compliance */}
                <Stack spacing={4} sx={{ zIndex: 1, width: 250 }}>
                    <Typography variant="subtitle2" color="text.secondary" textAlign="center">COMPLIANCE</Typography>
                    {SAMPLE_NODES.clauses.map(cl => (
                        <Paper key={cl.id} sx={{ p: 2, borderRadius: 3, borderLeft: '4px solid #1a237e', textAlign: 'center' }}>
                            <Rule sx={{ color: 'primary.main', mb: 1 }} />
                            <Typography variant="body2" fontWeight="bold">{cl.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{cl.framework}</Typography>
                        </Paper>
                    ))}
                </Stack>
            </Box>

            <Box mt={6}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Visualizing how control performance cascades into risk exposure and regulatory compliance.
                </Typography>
            </Box>
        </Box>
    );
}
