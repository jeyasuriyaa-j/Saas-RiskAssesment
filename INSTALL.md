# 🚀 Installation Guide

1. Install Node.js (Mac: `brew install node` | Win: `winget install OpenJS.NodeJS.LTS`)
2. Install PostgreSQL (Mac: `brew install postgresql@15` | Win: `winget install PostgreSQL.PostgreSQL`)
3. Create database: `createdb risk_assessment_db`
4. Initialize schema: `psql -d risk_assessment_db -f backend/src/database/schema.sql`
5. Configure `.env`: Copy `backend/.env.example` to `.env` and add API keys
6. Start Backend: `cd backend && npm install && npm run dev`
7. Start Frontend: `cd frontend && npm install && npm start`
8. Verify Access: Open http://localhost:3000 in your browser
