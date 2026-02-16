import axios from 'axios';
import * as performance from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const CONCURRENT_REQUESTS = 50;
const TOKEN = process.env.TEST_AUTH_TOKEN;

async function runBenchmark() {
    if (!TOKEN) {
        console.error('TEST_AUTH_TOKEN environment variable is required');
        process.exit(1);
    }

    console.log(`Starting benchmark: ${CONCURRENT_REQUESTS} concurrent requests to ${BASE_URL}/risks`);

    const start = performance.performance.now();
    const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_) => {
        const reqStart = performance.performance.now();
        try {
            await axios.get(`${BASE_URL}/risks`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            const reqEnd = performance.performance.now();
            return { success: true, duration: reqEnd - reqStart };
        } catch (error) {
            const reqEnd = performance.performance.now();
            return { success: false, duration: reqEnd - reqStart, error: (error as any).message };
        }
    });

    const results = await Promise.all(requests);
    const end = performance.performance.now();

    const successful = results.filter(r => r.success);
    const durations = successful.map(r => r.duration).sort((a, b) => a - b);

    const totalDuration = end - start;
    const avgLatency = durations.reduce((a, b) => a + b, 0) / successful.length;
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    console.log('\n--- Benchmark Results ---');
    console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${CONCURRENT_REQUESTS - successful.length}`);
    console.log(`Total Time: ${totalDuration.toFixed(2)}ms`);
    console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${p95?.toFixed(2)}ms`);
    console.log(`P99 Latency: ${p99?.toFixed(2)}ms`);
    console.log(`Throughput: ${(successful.length / (totalDuration / 1000)).toFixed(2)} req/sec`);

    if (results.some(r => !r.success)) {
        console.log('\nErrors encountered:');
        const errors = [...new Set(results.filter(r => !r.success).map(r => r.error))];
        errors.forEach(e => console.log(`- ${e}`));
    }
}

runBenchmark().catch(console.error);
