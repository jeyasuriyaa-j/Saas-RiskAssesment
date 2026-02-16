#!/bin/bash

# Automated Installation Script for Risk Assessment SaaS
# This script installs all prerequisites, sets up dependencies, and prepares the environment

echo "🚀 Risk Assessment SaaS - Automated Setup"
echo "=========================================="
echo ""

# Check if Homebrew is installed (for macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo "📦 Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Ensure Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "📦 Installing Node.js..."
        brew install node
    fi

    # Ensure PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        echo "📦 Installing PostgreSQL..."
        brew install postgresql@15
        brew services start postgresql@15
    fi
fi

echo "📦 Installing all dependencies (this may take a few minutes)..."
npm run install:all

echo "⚙️ Setting up environment variables..."
npm run setup

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the entire platform (Backend, Frontend, and Landing Page):"
echo "   npm run dev"
echo ""
echo "📝 Note: Please ensure your PostgreSQL server is running and you have created the 'risk_assessment_db' database."
echo "   To initialize the database, run: cd backend && npm run db:init (if available)"
echo ""
echo ""
