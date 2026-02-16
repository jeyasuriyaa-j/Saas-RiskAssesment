# AI Performance Optimization Plan

## Current Situation Analysis

**Problem**: AI analysis for uploaded Excel files is taking too long, showing "AI is analysing and mapping your risks" indefinitely.

**Current Architecture**:
- Using Google Gemini via OpenRouter API
- max_tokens: 4096 (recently increased)
- Timeout: 25 seconds per request
- No batch processing for large files (1000+ rows)
- Synchronous processing (user waits for completion)

---

## Optimization Strategies

### 1. **Model Selection Optimization** (Quick Win)

#### Option A: Use Faster Flash Models
```env
GEMINI_MODEL=google/gemini-1.5-flash
```
**Pros**:
- 2-3x faster than gemini-2.0
- Cheaper per request
- Good for structured data tasks

**Cons**:
- Slightly lower quality for complex reasoning
- May need prompt adjustments

**Expected Improvement**: 40-60% faster

#### Option B: Use OpenAI GPT-4o-Mini
```env
GEMINI_MODEL=openai/gpt-4o-mini
```
**Pros**:
- Excellent for structured JSON tasks
- Fast and cost-effective

**Cons**:
- Different response patterns
- May need prompt tweaks

**Expected Improvement**: 30-50% faster

#### Recommendation:
Start with `google/gemini-1.5-flash` for maximum speed.

---

### 2. **Prompt Optimization** (Medium Effort)

#### Current Prompt Issues:
- Too verbose (asking for 7 fields per risk)
- Complex requirements
- Large context per batch

#### Optimized Prompt:
```typescript
const prompt = `Analyze ${entries.length} risks. Return JSON array.

Data: ${entries.map((e, i) => `${i+1}. "${e.statement}" (${e.category})`).join(', ')}

Provide for each:
- improved_statement: Clear rewrite
- suggested_category: One word
- score_analysis: {user_score_status, suggested_likelihood, suggested_impact, reasoning}
- criticality: Low/Medium/High/Critical
- confidence_score: 0-100

Return ONLY valid JSON array.`;
```

**Expected Improvement**: 20-30% faster, fewer errors

---

### 3. **Caching Strategy** (High Impact for Production)

#### Implementation:
```typescript
// Cache key generation
const cacheKey = generateHash({
  fileContent: fileHash,
  mappings: columnMappings,
  timestamp: Date.now()
});

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Process and cache
await redis.setex(cacheKey, 86400, JSON.stringify(results)); // 24hr cache
```

**Benefits**:
- Instant returns for duplicate imports
- Reduced API costs
- Better user experience

**Expected Improvement**: Near-instant for cached files

---

### 4. **Local AI Implementation** (High Effort, Low Cost)

#### Option A: Ollama (Recommended for Local/Dev)
```bash
# Install Ollama
brew install ollama

# Pull optimized model
ollama pull llama3.1:8b-instruct-fp16

# Or use smaller model for speed
ollama pull llama3.2:3b
```

**Backend Integration**:
```typescript
const ollama = new OpenAI({
 http://localhost: baseURL: '11434/v1',
  apiKey: 'ollama',
});

const response = await ollama.chat.completions.create({
  model: 'llama3.2:3b',
  messages: [{ role: 'user', content: prompt }],
});
```

**Pros**:
- Free after initial setup
- No API rate limits
- Complete privacy
- Offline capability

**Cons**:
- Slower than cloud APIs (2-5x)
- Requires good hardware (16GB+ RAM, GPU preferred)
- Model quality varies

**Expected Performance**:
- 3-8 seconds per batch (vs 2-5s for cloud)
- Better for dev/testing than production

#### Option B: Local GPU Server (Production)
- Use vLLM or TensorRT-LLM
- Requires NVIDIA GPU (RTX 3080+)
- 10-50x faster than Ollama
- Higher upfront cost, lower per-request cost

---

### 5. **Production Deployment Architecture**

#### Recommended Stack:
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend App   │────▶│  Backend API     │────▶│  Redis Cache    │
│  (React/MUI)    │     │  (Express/TS)    │     │  (Results)      │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Message Queue (Bull)    │
                    │  - Background Jobs       │
                    │  - Rate Limiting         │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
     │  AI Worker 1    │ │ AI Worker 2 │ │  AI Worker N    │
     │  (Gemini Flash) │ │ (Gemini 2.0)│ │  (Fallback)     │
     └─────────────────┘ └─────────────┘ └─────────────────┘
```

#### Key Components:

1. **Background Job Processing**:
   ```typescript
   // Convert to async job
   const jobId = await importQueue.add({
     filePath: uploadedFile.path,
     tenantId: user.tenantId
   }, {
     attempts: 3,
     backoff: { type: 'exponential', delay: 2000 }
   });

   // Frontend polls for status
   const status = await importQueue.getJobProgress(jobId.id);
   ```

2. **Rate Limiting**:
   ```typescript
   const limiter = rateLimit({
     windowMs: 60 * 1000, // 1 minute
     max: 60, // 60 requests per minute (Gemini rate limit)
     message: 'Too many AI requests, please wait'
   });
   ```

3. **Auto-scaling Workers**:
   - Use Kubernetes or AWS Lambda for dynamic scaling
   - Scale based on queue length
   - More workers = faster processing

---

### 6. **Incremental Processing Strategy**

#### For 1000+ Row Files:
```typescript
async function processLargeFile(jobId: string, rows: any[]) {
  const BATCH_SIZE = 10;
  const MAX_CONCURRENT = 5;

  // Process in chunks with concurrency control
  for (let i = 0; i < rows.length; i += BATCH_SIZE * MAX_CONCURRENT) {
    const chunk = rows.slice(i, i + BATCH_SIZE * MAX_CONCURRENT);

    await Promise.all(
      chunk.map((_, batchIndex) =>
        processBatch(rows.slice(i + batchIndex * BATCH_SIZE, i + (batchIndex + 1) * BATCH_SIZE))
      )
    );

    // Update progress
    const progress = Math.min((i + BATCH_SIZE * MAX_CONCURRENT) / rows.length * 100, 100);
    await updateJobProgress(jobId, progress);
  }
}
```

**Benefits**:
- Better progress tracking
- Avoid timeouts
- Memory efficient

---

## Recommended Implementation Plan

### Phase 1: Immediate (Today)
1. **Change to faster model**:
   ```bash
   # .env
   GEMINI_MODEL=google/gemini-1.5-flash
   ```

2. **Optimize prompt** (reduce fields from 7 to 5)
3. **Add progress bar** to frontend

### Phase 2: This Week
1. **Implement Redis caching**
2. **Add background job processing** with Bull queue
3. **Improve error handling** and retry logic

### Phase 3: This Month
1. **Set up Ollama for development**
2. **Implement incremental processing** for large files
3. **Add monitoring and alerts**

### Phase 4: Production Launch
1. **Deploy with auto-scaling workers**
2. **Set up rate limiting** and circuit breakers
3. **Implement caching layer** (Redis + CDN)

---

## Cost Comparison

| Solution | Setup Cost | Per-Request Cost | Speed | Best For |
|----------|-----------|-----------------|-------|----------|
| Gemini 1.5 Flash | $0 | $0.000075/1K tokens | 2-5s | Production |
| GPT-4o-Mini | $0 | $0.00015/1K tokens | 2-4s | Production |
| Ollama (Local) | $0 (CPU) / $500 (GPU) | Free | 5-15s | Dev/Testing |
| vLLM (GPU Server) | $2000+ | Electricity only | 0.5-2s | Enterprise |

---

## Immediate Actions

### For Your Current Slow File:
1. **Cancel the current import** using the Cancel button
2. **Switch to faster model**:
   ```bash
   # In backend/.env
   GEMINI_MODEL=google/gemini-1.5-flash
   ```
3. **Restart server**: `npm run dev`
4. **Try again** with smaller test file (50-100 rows)

### For Live Hosting:
1. Start with **Gemini 1.5 Flash** (fastest/cheapest)
2. Add **Redis caching** (prevents duplicate processing)
3. Use **background jobs** (user doesn't wait)
4. Monitor **API usage** and adjust rate limits

---

## Questions to Consider

1. **What's your typical file size?** (50 rows vs 1000 rows)
2. **How many users** will be importing simultaneously?
3. **Budget constraints** for API costs?
4. **Hardware available** for local AI?

Based on your answers, I can provide more specific recommendations.
