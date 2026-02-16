# 🚀 Quick Start Guide - Local Development

## Prerequisites

Before you begin, install these on your Mac:

1. **Node.js 18+** (Required for both backend and frontend)
   ```bash
   brew install node
   ```

2. **PostgreSQL 15+** (Local database)
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

3. **OpenAI API Key** (For AI features)
   - Sign up at https://platform.openai.com/
   - Create an API key
   - Keep it handy for configuration

---

## Step 1: Database Setup (5 minutes)

```bash
# Create the database
createdb risk_assessment_db

# Navigate to backend directory
cd /Users/jeyasuriyaajeyakumar/Desktop/antigravity/risk-assessment-saas/backend

# Run the schema to create all tables
psql -d risk_assessment_db -f src/database/schema.sql
```

You should see output confirming tables were created.

---

## Step 2: Backend Setup (5 minutes)

```bash
# Still in the backend directory
cd /Users/jeyasuriyaajeyakumar/Desktop/antigravity/risk-assessment-saas/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `.env` file** with your settings:
```bash
# Open in your editor
nano .env
# or
code .env
```

**Minimum required configuration**:
```env
# Database (local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=risk_assessment_db
DB_USER=YOUR_MAC_USERNAME
DB_PASSWORD=
DB_SSL=false

# JWT Secrets (generate random strings)
JWT_SECRET=your_random_secret_key_here_change_this
JWT_REFRESH_SECRET=your_random_refresh_key_here_change_this

# OpenAI API Key
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Start the backend**:
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📍 Environment: development
🔗 API Base URL: http://localhost:5000/api/v1
```

---

## Step 3: Frontend Setup (5 minutes)

**Open a new terminal window**, then:

```bash
# Navigate to frontend directory
cd /Users/jeyasuriyaajeyakumar/Desktop/antigravity/risk-assessment-saas/frontend

# Install dependencies
npm install

# Start the development server
npm start
```

Your browser will automatically open to `http://localhost:3000`

---

## Step 4: Test the Application

### 1. Register Your Organization
- Click "Sign Up" on the login page
- Fill in:
  - Company Name: `Test Company`
  - Subdomain: `test`
  - Your Name: `Your Name`
  - Email: `admin@test.com`
  - Password: `password123`
- Click "Create Account"

### 2. View Dashboard
You'll be automatically logged in and see the dashboard with 0 risks.

### 3. Test Excel Import (The Cool Part!)
- Click "Import Excel" in the sidebar
- Create a simple test Excel file with columns like:
  - Risk ID, Description, Likelihood, Impact
- Drag and drop it
- Watch AI analyze and suggest mappings!
- Confirm and import

---

## 🎯 What's Running Locally

| Component | Location | Port |
|-----------|----------|------|
| **Frontend** | React Dev Server | http://localhost:3000 |
| **Backend API** | Express Server | http://localhost:5000 |
| **Database** | PostgreSQL | localhost:5432 |
| **File Storage** | Local filesystem | `backend/uploads/` |

**No cloud services required!** Everything runs on your Mac.

---

## 📁 Local File Storage

Uploaded Excel files are stored locally:
```
backend/uploads/
```

Logs are stored locally:
```
backend/logs/
  - combined.log
  - error.log
```

---

## 🔧 Troubleshooting

### Backend won't start?
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# If not running, start it
brew services start postgresql@15
```

### Database connection error?
```bash
# Check your username
whoami

# Update DB_USER in .env to match your Mac username
```

### Frontend won't start?
```bash
# Make sure Node.js is installed
node --version  # Should show v18 or higher

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### OpenAI API errors?
- Verify your API key is correct in `.env`
- Check you have credits: https://platform.openai.com/usage
- The app will work without AI, but Excel import won't have smart mapping

---

## 🚀 Next Steps

Once everything is running locally:

1. **Test all features** - Create risks, import Excel, view analytics
2. **Customize** - Modify code, add features, adjust UI
3. **Prepare for cloud** - When ready, we can:
   - Deploy backend to AWS/Azure/Heroku
   - Deploy frontend to Vercel/Netlify
   - Migrate database to cloud PostgreSQL
   - Add S3 for file storage
   - Set up CI/CD pipeline

---

## 💡 Development Tips

**Backend changes**: Server auto-restarts with nodemon
**Frontend changes**: Hot reload in browser
**Database changes**: Re-run schema.sql or write migrations

**Useful commands**:
```bash
# View database
psql risk_assessment_db

# Check running processes
lsof -i :5000  # Backend
lsof -i :3000  # Frontend

# View logs
tail -f backend/logs/combined.log
```

---

## ✅ You're Ready!

Your AI-powered Risk Assessment platform is now running **100% locally** on your Mac. No cloud dependencies, no external services (except OpenAI API for AI features).

**Start developing and testing!** 🎉
