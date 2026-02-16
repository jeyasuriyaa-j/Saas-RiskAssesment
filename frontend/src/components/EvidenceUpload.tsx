import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Alert
} from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import { evidenceService, Evidence } from '../services/compliance-report.service';

interface EvidenceUploadProps {
    controlId: string;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({ controlId }) => {
    const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadEvidence();
    }, [controlId]);

    const loadEvidence = async () => {
        setLoading(true);
        try {
            const data = await evidenceService.listByControl(controlId);
            setEvidenceList(data);
        } catch (err) {
            console.error('Failed to load evidence', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setUploading(true);
            setError(null);
            try {
                await evidenceService.upload(controlId, file);
                await loadEvidence();
            } catch (err) {
                console.error('Upload failed', err);
                setError('Failed to upload evidence.');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this evidence?')) return;
        try {
            await evidenceService.delete(id);
            setEvidenceList(list => list.filter(e => e.id !== id));
        } catch (err) {
            console.error('Delete failed', err);
            setError('Failed to delete evidence.');
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Evidence</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <input
                accept="*/*"
                style={{ display: 'none' }}
                id={`raised-button-file-${controlId}`}
                type="file"
                onChange={handleFileChange}
            />
            <label htmlFor={`raised-button-file-${controlId}`}>
                <Button
                    variant="outlined"
                    component="span"
                    startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                    disabled={uploading}
                    size="small"
                >
                    Upload Evidence
                </Button>
            </label>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                    <CircularProgress size={20} />
                </Box>
            ) : (
                <List dense>
                    {evidenceList.map((evidence) => (
                        <ListItem key={evidence.id}>
                            <Box mr={2}>
                                <FileIcon color="action" />
                            </Box>
                            <ListItemText
                                primary={evidence.file_name}
                                secondary={new Date(evidence.uploaded_at).toLocaleDateString()}
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(evidence.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                    {evidenceList.length === 0 && (
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                            No evidence uploaded.
                        </Typography>
                    )}
                </List>
            )}
        </Box>
    );
};

export default EvidenceUpload;
