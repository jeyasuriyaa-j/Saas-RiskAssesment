import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Select, MenuItem, Typography, SelectChangeEvent } from '@mui/material';

interface EditableCellProps {
    value: any;
    row: any;
    field: string;
    type?: 'text' | 'select' | 'number';
    options?: { value: string; label: string; color?: string; gradient?: string }[];
    onChange: (newValue: any) => void;
    editable?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    value,
    field,
    type = 'text',
    options = [],
    onChange,
    editable = true,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (!editable) {
        return <Typography variant="body2">{value}</Typography>;
    }

    if (isEditing) {
        if (type === 'select') {
            return (
                <Select
                    value={localValue || ''}
                    onChange={(e: SelectChangeEvent<any>) => {
                        setLocalValue(e.target.value);
                        onChange(e.target.value);
                        setIsEditing(false);
                    }}
                    onBlur={() => setIsEditing(false)}
                    variant="standard"
                    fullWidth
                    autoFocus
                    defaultOpen
                    sx={{
                        fontSize: '0.875rem',
                        '& .MuiSelect-select': { py: 0.5 }
                    }}
                >
                    {options.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
            );
        }

        return (
            <TextField
                inputRef={inputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                variant="standard"
                fullWidth
                autoFocus
                InputProps={{ style: { fontSize: '0.875rem' } }}
            />
        );
    }

    // Display Mode
    const currentOption = options.find((opt) => opt.value === localValue);

    return (
        <Box
            onClick={() => setIsEditing(true)}
            sx={{
                width: '100%',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: type === 'number' ? 'flex-end' : 'flex-start',
                cursor: 'pointer',
                borderRadius: '8px',
                px: 1,
                mx: -1,
                transition: 'all 0.15s ease-in-out',
                border: '1px solid transparent',
                '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.1)',
                },
            }}
        >
            {type === 'select' ? (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: field === 'priority' ? 1.2 : 0,
                    py: field === 'priority' ? 0.2 : 0,
                    borderRadius: field === 'priority' ? '20px' : '4px',
                    background: field === 'priority' ? (currentOption?.gradient || 'rgba(255,255,255,0.1)') : 'transparent',
                    color: field === 'priority' ? '#fff' : (currentOption?.color || 'rgba(255,255,255,0.7)'),
                    fontWeight: field === 'priority' ? 800 : 600,
                    fontSize: field === 'priority' ? '0.65rem' : '0.8rem',
                    textTransform: field === 'priority' ? 'uppercase' : 'none',
                    letterSpacing: field === 'priority' ? '0.05em' : 'normal',
                    boxShadow: field === 'priority' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                }}>
                    {currentOption?.label || localValue}
                </Box>
            ) : (
                <Typography variant="body2" noWrap sx={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: 500
                }}>
                    {localValue}
                </Typography>
            )}
        </Box>
    );
};
