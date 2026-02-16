# Frontend Setup Guide

## Prerequisites

- Node.js 18+ and npm

## Installation

**Note**: Node.js is required to run the frontend. Please install it first:
- Download from: https://nodejs.org/
- Or use Homebrew: `brew install node`

Once Node.js is installed:

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment (optional)**
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api/v1
```

4. **Start development server**
```bash
npm start
```

The app will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main layout with navigation
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── pages/
│   │   ├── Login.tsx           # Login page
│   │   ├── Register.tsx        # Registration page
│   │   ├── Dashboard.tsx       # Dashboard with analytics
│   │   ├── RiskList.tsx        # Risk register table
│   │   ├── RiskDetail.tsx      # Single risk view
│   │   └── ImportExcel.tsx     # Excel import wizard
│   ├── services/
│   │   └── api.ts              # API client with axios
│   ├── App.tsx                 # Main app with routing
│   └── index.tsx               # Entry point
├── package.json
└── tsconfig.json
```

## Features Implemented

### Authentication
- ✅ Login with email/password
- ✅ Organization registration
- ✅ JWT token management with auto-refresh
- ✅ Protected routes

### Dashboard
- ✅ Risk statistics overview
- ✅ Status and priority breakdown
- ✅ Top risk categories
- ✅ Average risk scores

### Risk Management
- ✅ Risk list with search
- ✅ Color-coded priorities and statuses
- ✅ Clickable rows to view details

### Excel Import
- ✅ Drag-and-drop file upload
- ✅ AI-powered column mapping
- ✅ Confidence scores for mappings
- ✅ Manual mapping adjustment
- ✅ Import progress tracking
- ✅ Results summary

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (not recommended)

## Next Steps

1. Install Node.js if not already installed
2. Run `npm install` in the frontend directory
3. Start the backend server (see backend/README.md)
4. Start the frontend with `npm start`
5. Register a new organization at http://localhost:3000/register
6. Try importing an Excel risk register!

## Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Dropzone** - File uploads
