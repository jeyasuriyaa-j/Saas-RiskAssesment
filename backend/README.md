# Backend Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- OpenAI API key

## Installation

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials
- JWT secrets (generate secure random strings)
- OpenAI API key
- AWS S3 credentials (optional, for production)

3. **Create PostgreSQL database**
```bash
createdb risk_assessment_db
```

4. **Run database schema**
```bash
psql -d risk_assessment_db -f src/database/schema.sql
```

5. **Create logs directory**
```bash
mkdir -p logs
mkdir -p uploads
```

## Running the Server

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/register` - Register new organization
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token

### Risks
- `GET /risks` - List all risks (with filtering)
- `GET /risks/:riskId` - Get risk details
- `POST /risks` - Create new risk
- `PUT /risks/:riskId` - Update risk
- `DELETE /risks/:riskId` - Delete risk

### Excel Import
- `POST /import/upload` - Upload Excel file
- `GET /import/jobs/:jobId` - Get import job status
- `POST /import/jobs/:jobId/confirm-mapping` - Confirm and execute import
- `GET /import/jobs/:jobId/results` - Get import results

### AI Services
- `POST /ai/suggest-score` - Get AI risk score suggestions
- `POST /ai/improve-description` - Improve risk description
- `POST /ai/recommend-controls` - Get control recommendations

### Analytics
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/heatmap` - Risk heatmap data

## Testing

Test the API with curl:

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corp",
    "subdomain": "acme",
    "admin_email": "admin@acme.com",
    "admin_name": "John Doe",
    "password": "SecurePass123!"
  }'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "SecurePass123!"
  }'
```

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # Main Express server
│   ├── database/
│   │   ├── connection.ts      # PostgreSQL connection pool
│   │   └── schema.sql         # Database schema
│   ├── routes/
│   │   ├── auth.routes.ts     # Authentication routes
│   │   ├── risk.routes.ts     # Risk management routes
│   │   ├── import.routes.ts   # Excel import routes
│   │   ├── ai.routes.ts       # AI service routes
│   │   └── analytics.routes.ts # Analytics routes
│   ├── services/
│   │   └── ai.service.ts      # OpenAI integration
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication
│   │   └── errorHandler.ts   # Error handling
│   └── utils/
│       └── logger.ts          # Winston logger
├── uploads/                   # Uploaded Excel files
├── logs/                      # Application logs
├── package.json
├── tsconfig.json
└── .env
```

## Next Steps

1. Set up frontend React application
2. Implement additional features (controls, compliance, reports)
3. Add unit and integration tests
4. Set up CI/CD pipeline
5. Deploy to cloud (AWS/Azure/GCP)
