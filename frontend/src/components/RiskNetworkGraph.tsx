import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Box, Card, CardContent, Typography, CircularProgress, useTheme } from '@mui/material';
import { riskAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface GraphNode {
    id: string;
    label: string;
    val: number; // size
    color: string;
    risk_score: number;
}

interface GraphLink {
    source: string;
    target: string;
    value: number; // strength
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export default function RiskNetworkGraph() {
    const theme = useTheme();
    const navigate = useNavigate();
    const fgRef = useRef<any>();
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ w: 800, h: 500 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Update dimensions on resize
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    w: containerRef.current.clientWidth,
                    h: 500
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 1. Fetch all risks
            const risksRes = await riskAPI.list({ limit: 100, status: 'ACTIVE' });
            const risks = risksRes.data.risks || [];

            // 2. Trigger Correlation Analysis (or fetch cached)
            // For MVP, we'll trigger it live (Phase 2 requirement)
            // Ideally this should be cached, but for 'Vibe' demo we want to show it working.
            const correlationRes = await riskAPI.analyzeCorrelations(risks.map((r: any) => r.risk_id));
            const analysis = correlationRes.data;

            // 3. Transform to Graph Data
            const nodes: GraphNode[] = risks.map((r: any) => ({
                id: r.risk_id,
                label: r.risk_code,
                name: r.statement,
                val: Math.max(r.inherent_risk_score || 5, 3), // Min size
                color: getRiskColor(r.inherent_risk_score),
                risk_score: r.inherent_risk_score
            }));

            const links: GraphLink[] = (analysis.correlations || []).map((c: any) => ({
                source: c.source_risk_id,
                target: c.target_risk_id,
                value: c.strength * 5, // Visual thickness
                type: c.relationship_type
            }));

            setData({ nodes, links });

            // Zoom to fit after render
            setTimeout(() => {
                if (fgRef.current) {
                    fgRef.current.zoomToFit(400);
                }
            }, 1000);

        } catch (error) {
            console.error("Failed to load risk network:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 20) return '#ef4444'; // Red
        if (score >= 10) return '#f59e0b'; // Orange
        return '#22c55e'; // Green
    };

    const handleNodeClick = (node: any) => {
        navigate(`/risks/${node.id}`);
    };

    // Prepare container style for Dark/Light mode
    const isDark = theme.palette.mode === 'dark';
    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

    return (
        <Card className="glass fade-in hover-lift" sx={{ height: '100%', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, height: '100%', position: 'relative' }}>
                <Box p={2} sx={{ position: 'absolute', top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: textColor }}>
                        Risk Correlation Network
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        AI-Detected Cause & Effect Relationships
                    </Typography>
                </Box>

                <div ref={containerRef} style={{ width: '100%', height: '500px' }}>
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.w}
                        height={dimensions.h}
                        graphData={data}
                        backgroundColor={bgColor}
                        nodeLabel="name"
                        nodeColor="color"
                        nodeRelSize={6}
                        linkColor={() => isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                        linkWidth="value"
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={(d: any) => d.value * 0.001}
                        onNodeClick={handleNodeClick}
                        cooldownTicks={100}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
