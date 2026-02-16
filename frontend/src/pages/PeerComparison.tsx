import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';
import { industryService, IndustryBenchmark } from '../services/industry.service';
// import { getMyRiskStats } from '../services/risk.service'; // Assuming this exists or we mock it

const PeerComparison: React.FC = () => {
    const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState('FinTech'); // Default for demo

    useEffect(() => {
        loadBenchmarks();
    }, [selectedIndustry]);

    const loadBenchmarks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await industryService.getBenchmarks(selectedIndustry);
            setBenchmarks(data);
        } catch (err) {
            console.error('Failed to load benchmarks:', err);
            setError('Failed to load benchmarking data.');
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for Radar Chart (Category overlap)
    const radarData = benchmarks.map(b => ({
        subject: b.risk_category,
        IndustryAvg: b.avg_impact, // Using impact for radar, could be composite score
        MyScore: Math.random() * 5 // Mocking "My Score" for now until we have the stats API
    }));

    // Prepare data for Bar Chart (Likelihood vs Impact by Category)
    const barData = benchmarks.map(b => ({
        category: b.risk_category,
        IndustryLikelihood: b.avg_likelihood,
        IndustryImpact: b.avg_impact
    }));

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Peer Comparison
                </Typography>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="industry-select-label">Industry</InputLabel>
                    <Select
                        labelId="industry-select-label"
                        value={selectedIndustry}
                        label="Industry"
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                    >
                        <MenuItem value="FinTech">FinTech</MenuItem>
                        <MenuItem value="Healthcare">Healthcare</MenuItem>
                        <MenuItem value="SaaS">SaaS</MenuItem>
                        <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                        <MenuItem value="Retail">Retail</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {/* Key Metrics */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" gutterBottom>
                                Industry Benchmarks - {selectedIndustry}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Compare your risk profile against {selectedIndustry} averages.
                                Based on {benchmarks.reduce((acc, curr) => acc + (curr.risk_count || 0), 0)} data points.
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Radar Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom>Risk Intensity vs Peers</Typography>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                                    <Radar name="Industry Avg" dataKey="IndustryAvg" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Radar name="My Score" dataKey="MyScore" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Bar Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom>Industry Profile (Likelihood vs Impact)</Typography>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={barData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="category" />
                                    <YAxis domain={[0, 5]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="IndustryLikelihood" fill="#8884d8" name="Avg Likelihood" />
                                    <Bar dataKey="IndustryImpact" fill="#82ca9d" name="Avg Impact" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Container>
    );
};

export default PeerComparison;
