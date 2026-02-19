import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    IconButton,
    TextField,
    Typography,
    Avatar,
    Stack,
    CircularProgress,
    Fab,
    Zoom,
    Fade,
    Divider
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as BotIcon
} from '@mui/icons-material';
import { chatAPI } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your Risk Assistant. Ask me anything about your risks, controls, or incidents." }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatAPI.sendMessage(input, messages);
            const botMsg: Message = { role: 'assistant', content: response.data.reply };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = { role: 'assistant', content: "Sorry, I'm having trouble connecting to the AI service. Please check if the backend is running." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <Fab
                color="primary"
                aria-label="chat"
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: 'linear-gradient(135deg, #00d4ff 0%, #c77dff 100%)',
                    boxShadow: '0 8px 32px rgba(199, 125, 255, 0.4)',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'scale(1.1)' },
                    zIndex: 1000
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </Fab>

            {/* Chat Panel */}
            <Zoom in={isOpen}>
                <Paper
                    elevation={12}
                    sx={{
                        position: 'fixed',
                        bottom: 96,
                        right: 24,
                        width: { xs: 'calc(100% - 48px)', sm: 380 },
                        height: 500,
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        background: 'background.paper',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.2)',
                        zIndex: 1000
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, background: 'linear-gradient(90deg, rgba(0,212,255,0.1) 0%, rgba(199,125,255,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff', width: 32, height: 32 }}>
                                <BotIcon fontSize="small" />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">Risk Assistant</Typography>
                                <Typography variant="caption" color="text.secondary">AI-Powered Insights</Typography>
                            </Box>
                        </Stack>
                        <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'text.secondary' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Divider sx={{ borderColor: 'divider' }} />

                    {/* Messages Container */}
                    <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg, idx) => (
                            <Fade in key={idx} style={{ transitionDelay: '100ms' }}>
                                <Box sx={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    <Box sx={{
                                        p: 1.5,
                                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)' : undefined,
                                        border: msg.role === 'user' ? 'none' : '1px solid',
                                        borderColor: msg.role === 'user' ? undefined : 'divider',
                                    }}>
                                        <Typography variant="body2" sx={{ color: msg.role === 'user' ? '#fff' : 'text.primary', lineHeight: 1.5 }}>
                                            {msg.content}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Fade>
                        ))}
                        {loading && (
                            <Box sx={{ alignSelf: 'flex-start', p: 1, bgcolor: 'action.hover', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={12} color="primary" />
                                <Typography variant="caption" color="text.secondary">AI is thinking...</Typography>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            autoComplete="off"
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        size="small"
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        sx={{ color: '#00d4ff' }}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                ),
                                sx: {
                                    borderRadius: '12px',
                                    bgcolor: 'action.hover',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'text.secondary' },
                                    '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                                }
                            }}
                        />
                    </Box>
                </Paper>
            </Zoom>
        </>
    );
};

export default ChatWidget;
