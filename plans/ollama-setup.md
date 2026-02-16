# Free & Fast AI: Ollama Local Setup Guide

## Why Ollama?

✅ **Completely Free** - No API costs, no rate limits
✅ **Fast Enough** - 3-8 seconds per batch (acceptable for dev)
✅ **Private** - All processing happens on your machine
✅ **Easy Setup** - Simple installation and API integration

## System Requirements

**Minimum (CPU only)**:
- 8GB RAM
- 4-core processor
- 10GB disk space

**Recommended (GPU加速)**:
- 16GB+ RAM
- NVIDIA GPU with 8GB+ VRAM
- 20GB disk space

## Step 1: Install Ollama

### macOS:
```bash
brew install ollama
```

### Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows:
Download from: https://ollama.ai/download

## Step 2: Start Ollama Server

```bash
# Start Ollama in background
ollama serve

# Keep it running (open new terminal for other commands)
```

## Step 3: Download Optimized Model

**For Risk Assessment (Recommended - 3GB)**:
```bash
ollama pull llama3.2:3b
```
- 3GB download
- 4GB RAM usage
- 3-6 seconds per batch
- Good quality for structured data

**Faster Alternative (2GB)**:
```bash
ollama pull llama3.2:1b
```
- 2GB download
- 2GB RAM usage
- 2-4 seconds per batch
- Lower quality but faster

**Best Quality (8GB)**:
```bash
ollama pull llama3.1:8b-instruct-fp16
```
- 8GB download
- 10GB RAM usage
- 5-10 seconds per batch
- Best quality

**Recommendation**: Start with `llama3.2:3b` for the best balance of speed and quality.

## Step 4: Configure Your Backend

Create a new environment file for local AI:

```bash
# Create backend/.env.local
cat > backend/.env.local << 'EOF'
# Use Ollama for local free AI
GEMINI_API_KEY=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:3b

# Keep your existing settings
JWT_SECRET=your-existing-secret
DATABASE_URL=your-existing-db
FRONTEND_URL=http://localhost:3000
EOF
```

## Step 5: Update AI Service

Modify [`backend/src/services/ai.service.ts`](backend/src/services/ai.service.ts) to support Ollama:

```typescript
import OpenAI from 'openai';

// Add OllAMA configuration
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

// Create Ollama client (reuse for all requests)
const ollamaClient = new OpenAI({
  baseURL: ollamaBaseUrl,
  apiKey: 'ollama', // Dummy key, Ollama doesn't require auth
});

// Update generateAIResponse function
export async function generateAIResponse(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Check if using Ollama (free local AI)
  if (apiKey === 'ollama' || apiKey === 'ollama ') {
    logger.info(`Using Ollama local AI with model: ${ollamaModel}`);
    
    const completionPromise = ollamaClient.chat.completions.create({
      model: ollamaModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048, // Lower for local models
      temperature: 0.1,
    });

    const completion: any = await Promise.race([
      completionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ollama Timeout')), 60000) // 60s timeout
      )
    ]);
    
    return completion.choices[0]?.message?.content || '';
  }
  
  // Original Gemini/OpenRouter logic continues...
}
```

## Step 6: Restart with Local AI

```bash
# Terminal 1: Keep Ollama running
ollama serve

# Terminal 2: Start your app with local AI
cd backend
export $(cat .env.local | xargs)  # Load local settings
npm run dev
```

## Step 7: Test Performance

Upload a small test file (10-20 rows) and measure:

**Expected Performance with llama3.2:3b**:
- 10 rows: 3-6 seconds
- 50 rows: 15-30 seconds (5 batches × 3-6s each)
- 100 rows: 30-60 seconds (10 batches)

## Comparison: Cloud API vs Ollama

| Metric | Gemini 2.0 (Cloud) | Ollama llama3.2:3b (Local) |
|--------|-------------------|---------------------------|
| Cost | $0.000075/1K tokens | Free |
| Speed | 2-5 seconds/batch | 3-6 seconds/batch |
| Setup | Minutes | 10-15 minutes |
| Privacy | Data sent to Google | 100% local |
| Hardware | None | 8GB+ RAM |
| Consistency | Always available | Requires server running |

## Optimizing Ollama Performance

### 1. GPU Acceleration (If you have NVIDIA)
```bash
# Check if GPU is being used
nvidia-smi

# Ollama automatically uses GPU if available
```

### 2. Increase Context Window
```bash
# Run with more context
OLLAMA_CONTEXT_LENGTH=8192 ollama serve
```

### 3. Use smaller model for speed
```bash
# If 3b is too slow, try 1b
ollama pull llama3.2:1b
OLLAMA_MODEL=llama3.2:1b npm run dev
```

### 4. Parallel Processing
The current batch size of 10 with concurrency of 3 works well with Ollama.

## Troubleshooting

### "Ollama not running"
```bash
# Start Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/version
```

### "Model not found"
```bash
# Download model again
ollama pull llama3.2:3b
```

### Out of Memory
```bash
# Use smaller model
ollama pull llama3.2:1b
OLLAMA_MODEL=llama3.2:1b npm run dev
```

### Too Slow
1. Check RAM usage: `htop` or Activity Monitor
2. Close other applications
3. Restart Ollama: `pkill ollama && ollama serve`

## Monitoring Performance

Add to your backend logs to track Ollama performance:

```typescript
// In generateAIResponse for Ollama
const startTime = Date.now();
const response = await ollamaClient.chat.completions.create({...});
const duration = Date.now() - startTime;

logger.info(`Ollama response: ${duration}ms, ${response.usage.total_tokens} tokens`);
```

## Moving to Production Later

When you're ready to host live:

1. **Keep Ollama for development** (free, fast enough)
2. **Switch to Gemini 1.5 Flash for production** (cheap, fast)
3. **Add Redis caching** (prevents duplicate AI calls)
4. **Implement background jobs** (users don't wait)

## Next Steps

1. **Install Ollama** (2 minutes)
2. **Pull model** `ollama pull llama3.2:3b` (2-5 minutes)
3. **Update backend code** (5 minutes)
4. **Test with small file** (1 minute)
5. **Measure performance** and adjust

Total setup time: **10-15 minutes** for completely free AI!

---

## Quick Commands Summary

```bash
# Install
brew install ollama    # macOS
# OR curl -fsSL https://ollama.ai/install.sh | sh  # Linux

# Start server
ollama serve

# Download model (do this in another terminal)
ollama pull llama3.2:3b

# Test it's working
curl http://localhost:11434/api/tags

# Run your app with local AI
cd backend
export GEMINI_API_KEY=ollama
export OLLAMA_MODEL=llama3.2:3b
npm run dev
```

Want me to implement the Ollama integration code in your backend now?