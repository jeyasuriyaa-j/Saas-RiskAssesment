# SWOT RISK Platform

An AI-powered Enterprise Risk Management (ERM) SaaS platform designed for high-performance risk identification, automated control mapping, vendor risk assessment, and SOC2 compliance readiness.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher (Running on Port 5432 by default)
- **Redis**: Required for batch processing
- **OpenRouter/OpenAI API Key**: For AI-driven analysis

### Installation
1. Install Node.js, PostgreSQL (Mac: `brew` | Win: `winget`)
2. Configure environment and database schema
3. Start backend: `npm run dev` in `backend/`
4. Start frontend: `npm start` in `frontend/`
5. Verify access at http://localhost:3000

## 🛠 Configuration

### Option 1: Admin Dashboard (Recommended)
1. Log in as an **Admin**.
2. Navigate to **Admin Settings -> AI Controls**.
3. Enter your **AI API Key** and **Model Identifier**.
4. Click **Save Changes**.

### Option 2: Environment Variables (.env)
Use the `backend/.env.example` as a template for your `backend/.env` file.
**IMPORTANT**: Generate secure local secrets for JWT by running:
```bash
node scripts/generate-secrets.js
```
Copy the output into your `.env`.

- `OPENROUTER_API_KEY`: Your OpenRouter API Key
- `AI_MODEL`: Set to `openrouter/aurora-alpha` (Default)

**Frontend**:
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000/api/v1)

## 📖 Key Features
- **AI Import**: High-speed batch analysis of Excel/CSV risk sheets.
- **Risk Heatmap**: Visual distribution of risks by Likelihood vs Impact.
- **Correlation Graph**: AI-detected relationships between risks.
- **SOC2 Management**: Automated mapping of controls to compliance criteria.
- **Evidence Vault**: Secure storage for control implementation proof.

## 📄 License
PROPRIETARY - All Rights Reserved.
