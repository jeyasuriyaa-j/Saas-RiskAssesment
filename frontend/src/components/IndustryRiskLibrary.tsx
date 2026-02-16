import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { industryService, IndustryRisk } from '../services/industry.service';

interface IndustryRiskLibraryProps {
    onImport: (risk: IndustryRisk) => void;
}

const IndustryRiskLibrary: React.FC<IndustryRiskLibraryProps> = ({ onImport }) => {
    const [risks, setRisks] = useState<IndustryRisk[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadRisks();
    }, []);

    const loadRisks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await industryService.getRisks();
            setRisks(data);
        } catch (err) {
            console.error('Failed to load industry risks:', err);
            setError('Failed to load industry risks.');
        } finally {
            setLoading(false);
        }
    };

    const filteredRisks = risks.filter(risk =>
        risk.statement.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
                Industry Risk Library
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Browse and import standard risks for your industry.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search risks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                    }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {filteredRisks.map((risk, index) => (
                        <React.Fragment key={risk.id || index}>
                            <ListItem alignItems="flex-start">
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="subtitle1">{risk.statement}</Typography>
                                            <Chip label={risk.category} size="small" color="primary" variant="outlined" />
                                        </Box>
                                    }
                                    secondary={
                                        <Box mt={0.5}>
                                            <Typography variant="body2" color="textSecondary">
                                                {risk.description}
                                            </Typography>
                                            <Box display="flex" gap={2} mt={0.5}>
                                                <Typography variant="caption">Typical Impact: {risk.typical_impact}/5</Typography>
                                                <Typography variant="caption">Typical Likelihood: {risk.typical_likelihood}/5</Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => onImport(risk)}
                                    >
                                        Import
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Divider component="li" />
                        </React.Fragment>
                    ))}
                    {filteredRisks.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No risks found." />
                        </ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
};

export default IndustryRiskLibrary;
