# 🚀 Installation Guide

1. Install Node.js (Mac: `brew install node` | Win: `winget install OpenJS.NodeJS.LTS`)
2. Install PostgreSQL (Mac: `brew install postgresql@15` | Win: `winget install PostgreSQL3. **Database Setup**
   - Create a database: `CREATE DATABASE risk_assessment_db;`
   - Run schema: `psql -d risk_assessment_db -f backend/src/database/schema.sql` (Note: Default port is 5432)
   - Seed data: `cd backend && npm run seed`

4. **Environment Configuration**
   - Backend: Copy `backend/.env.example` to `backend/.env` and update values.
   - Frontend: Copy `frontend/.env.example` to `frontend/.env`.
   - Security: Run `node scripts/generate-secrets.js` to get secure keys for your `.env`.

5. **Running the Application**
   - **Full Stack**: Run `npm run dev` in the root directory.
   - **Backend**: `npm run dev` in `backend/` (Port 5000)
   - **Frontend**: `npm start` in `frontend/` (Port 3000)
   - **Landing**: `npm run dev` in `landing/` (Port 3001)
&& npm install && npm start`
8. Verify Access: Open http://localhost:3000 in your browser
