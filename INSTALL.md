# 🚀 Manual Installation Guide

Since automated installation requires your password, please follow these steps in your terminal:

## Step 1: Install Homebrew (Package Manager)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Enter your password when prompted.** This is required for system-level installation.

After installation, add Homebrew to your PATH:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

## Step 2: Install Node.js

```bash
brew install node
```

Verify installation:
```bash
node --version  # Should show v20 or higher
npm --version   # Should show v10 or higher
```

---

## Step 3: Install PostgreSQL

```bash
brew install postgresql@15
brew services start postgresql@15
```

Verify PostgreSQL is running:
```bash
brew services list | grep postgresql
```

---

## Step 4: Set Up Database

```bash
cd /Users/jeyasuriyaajeyakumar/Desktop/antigravity/risk-assessment-saas/backend

# Create database
createdb risk_assessment_db

# Run schema to create tables
psql -d risk_assessment_db -f src/database/schema.sql
```

You should see output confirming tables were created.

---

## Step 5: Configure Backend

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `.env` file** (use `nano .env` or `code .env`):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=risk_assessment_db
DB_USER=YOUR_MAC_USERNAME_HERE  # Run 'whoami' to get this
DB_PASSWORD=
DB_SSL=false

# JWT Secrets (generate random strings)
JWT_SECRET=change_this_to_random_string_abc123xyz
JWT_REFRESH_SECRET=change_this_to_another_random_string_def456uvw

# OpenAI API Key (get from https://platform.openai.com/)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Other settings (defaults are fine)
NODE_ENV=development
PORT=5000
```

---

## Step 6: Start Backend

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📍 Environment: development
🔗 API Base URL: http://localhost:5000/api/v1
Database connected successfully
```

**Keep this terminal open!**

---

## Step 7: Start Frontend (New Terminal Window)

Open a **new terminal window**, then:

```bash
cd /Users/jeyasuriyaajeyakumar/Desktop/antigravity/risk-assessment-saas/frontend

# Install dependencies
npm install

# Start development server
npm start
```

Your browser will automatically open to `http://localhost:3000`

---

## ✅ Success!

You should now see:
- **Backend running** at http://localhost:5000
- **Frontend running** at http://localhost:3000
- **Login page** in your browser

### Next Steps:
1. Click "Sign Up" to create your organization
2. Fill in company details
3. Login and explore the dashboard
4. Try importing an Excel file!

---

## 🆘 Troubleshooting

### "command not found: brew"
- Homebrew installation didn't complete. Re-run Step 1.

### "command not found: createdb"
- PostgreSQL not in PATH. Run: `echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zprofile`

### "Database connection failed"
- Check PostgreSQL is running: `brew services list`
- Verify DB_USER in .env matches your username: `whoami`

### "OpenAI API error"
- Get API key from https://platform.openai.com/
- Add it to .env file
- Restart backend server

---

**Let me know once you've completed the installation and I can help you test the application!**
