# 🚗 TRAFFIC MANAGEMENT SYSTEM - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [API Documentation](#api-documentation)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software:
- **Node.js** (v14+) - [Download](https://nodejs.org/)
- **npm** (v6+) - Comes with Node.js
- **Microsoft SQL Server** (2019+) - [Download](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **SQL Server Management Studio** (SSMS) - [Download](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
- **Git** (Optional) - [Download](https://git-scm.com/)

### System Requirements:
- Windows/Mac/Linux Operating System
- Minimum 4GB RAM
- 500MB Free Disk Space
- Active Internet Connection

---

## 🗄️ Database Setup

### Step 1: Create Database in MSSQL

1. **Open SQL Server Management Studio**
   - Launch SSMS
   - Connect with:
     - Server: `localhost` or `.\SQLEXPRESS`
     - Authentication: SQL Server Authentication
     - Login: `sa`
     - Password: your local SQL Server password

2. **Create Database**
   ```sql
   CREATE DATABASE TrafficManagementSystem;
   ```

3. **Run Database Schema**
   - Copy all SQL from `database_schema.sql`
   - Open a new Query window
   - Paste and execute the SQL script
   - Wait for completion (should see "Database setup completed successfully!")

### Step 2: Verify Database Creation

```sql
-- Check if database exists
SELECT name FROM sys.databases WHERE name = 'TrafficManagementSystem';

-- List all tables
USE TrafficManagementSystem;
SELECT * FROM INFORMATION_SCHEMA.TABLES;
```

---

## 💻 Backend Setup

### Step 1: Create Backend Directory

```bash
mkdir traffic-management-system
cd traffic-management-system
mkdir backend
cd backend
```

### Step 2: Initialize Node Project

```bash
npm init -y
```

### Step 3: Install Dependencies

```bash
npm install express mssql dotenv jsonwebtoken bcryptjs cors helmet express-validator multer nodemailer axios uuid moment
npm install -D nodemon
```

### Step 4: Create Project Structure

```
backend/
├── config/
│   ├── database.js
│   └── constants.js
├── controllers/
│   ├── authController.js
│   ├── trafficController.js
│   ├── challanController.js
│   ├── officerController.js
│   └── reportController.js
├── routes/
│   ├── auth.js
│   ├── traffic.js
│   ├── challan.js
│   ├── officer.js
│   └── report.js
├── middleware/
│   ├── auth.js (rename from auth_middleware.js)
│   ├── errorHandler.js
│   └── logging.js
├── services/
│   └── (service files)
├── server.js
├── .env.example
└── package.json
```

### Step 5: Create .env File

```bash
# Copy .env.example to .env
cp .env.example .env
```

**Edit .env with your values:**
```
DB_SERVER=localhost
DB_NAME=TrafficManagementSystem
DB_USER=sa
DB_PASSWORD=your_sql_password
DB_PORT=1433
NODE_ENV=development
PORT=5000
HOST=localhost
JWT_SECRET=change_this_to_a_long_random_secret
CLIENT_URL=http://localhost:3000
```

### Step 6: Copy Backend Files

Copy all backend files to their respective directories:
- server.js → backend/
- database.js → backend/config/
- authController.js → backend/controllers/
- challanController.js → backend/controllers/
- auth.js → backend/routes/
- traffic.js → backend/routes/
- challan.js → backend/routes/
- officer.js → backend/routes/
- report.js → backend/routes/
- auth_middleware.js → backend/middleware/auth.js
- errorHandler.js → backend/middleware/
- logging.js → backend/middleware/

### Step 7: Update package.json Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --detectOpenHandles"
  }
}
```

### Step 8: Test Backend Connection

```bash
npm run dev
```

**Expected Output:**
```
╔════════════════════════════════════════╗
║   TRAFFIC MANAGEMENT SYSTEM - SERVER   ║
╚════════════════════════════════════════╝

🚗 Server running at: http://localhost:5000
📊 API Base URL: http://localhost:5000/api
✅ Ready to handle traffic management requests!
```

---

## 🎨 Frontend Setup

### Step 1: Create React App

```bash
cd ..
npx create-react-app frontend
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install react-router-dom axios formik yup three @react-three/fiber @react-three/drei google-map-react mapbox-gl recharts date-fns framer-motion zustand
```

### Step 3: Create Project Structure

```
frontend/src/
├── assets/
│   ├── fonts/
│   ├── images/
│   └── icons/
├── components/
│   ├── common/
│   ├── auth/
│   ├── dashboard/
│   ├── traffic/
│   ├── violations/
│   ├── reports/
│   └── 3d/
├── context/
│   ├── AuthContext.jsx
│   ├── TrafficContext.jsx
│   └── ChallanContext.jsx
├── hooks/
│   ├── useAuth.js
│   └── (other hooks)
├── services/
│   └── api.js
├── pages/
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   ├── OfficerDashboard.jsx
│   └── (other pages)
├── styles/
│   ├── neo-brutalist.css
│   ├── globals.css
│   └── (component styles)
├── App.jsx
└── index.js
```

### Step 4: Create .env File for Frontend

```bash
# Create .env in frontend root
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Step 5: Copy Frontend Files

Copy all component files to their respective directories:
- App.jsx → frontend/src/
- neo-brutalist.css → frontend/src/styles/
- LoginPage.jsx → frontend/src/pages/
- LoginPage.css → frontend/src/pages/
- OfficerDashboard.jsx → frontend/src/pages/
- OfficerDashboard.css → frontend/src/pages/
- AuthContext.jsx → frontend/src/context/
- TrafficContext.jsx → frontend/src/context/
- api.js → frontend/src/services/
- useAuth.js → frontend/src/hooks/
- CustomCursor.jsx → frontend/src/components/common/
- GlitchText.jsx → frontend/src/components/common/
- HardShadowButton.jsx → frontend/src/components/common/
- TrafficMap.jsx → frontend/src/components/traffic/
- TrafficMap.css → frontend/src/components/traffic/
- TrafficScene3D.jsx → frontend/src/components/3d/
- TrafficScene3D.css → frontend/src/components/3d/

### Step 6: Update package.json

```json
{
  "proxy": "http://localhost:5000",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

---

## 🚀 Running the Application

### Terminal 1 - Start Backend

```bash
cd backend
npm run dev
```

### Terminal 2 - Start Frontend

```bash
cd frontend
npm start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## 📚 Default Login Credentials

```
Username: officer1
Password: password123
Role: Officer
```

---

## 🔌 API Documentation

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "officer1",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": 2,
    "username": "officer1",
    "email": "officer1@traffic.gov",
    "role": "Officer",
    "firstName": "John",
    "lastName": "Smith"
  }
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer {token}
```

### Traffic Endpoints

#### Get Real-Time Status
```
GET /api/traffic/status?latitude=40.7128&longitude=-74.006&radius=5000
Authorization: Bearer {token}
```

#### Get Traffic Jams
```
GET /api/traffic/jams
Authorization: Bearer {token}
```

### Challan Endpoints

#### Create Challan
```
POST /api/challans
Authorization: Bearer {token}
Content-Type: application/json

{
  "violationId": 1,
  "vehicleId": 1,
  "violationType": "Speeding",
  "fineAmount": 5000,
  "dueDate": "2024-12-31",
  "description": "Exceeding speed limit"
}
```

#### Process Payment
```
POST /api/challans/{challanId}/payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "Credit Card",
  "transactionId": "TXN123456"
}
```

---

## 🎨 Neo-Brutalist Design System

### Color Palette
- **Background**: #F8F4E8 (Paper-like)
- **Primary**: #09090B (Ink-black)
- **Accent**: #D2E823 (Acid yellow-green)
- **Error**: #FF3B3B
- **Success**: #2ECC40
- **Warning**: #FF851B

### Typography
- **Display Font**: Dela Gothic One (All-caps, Ultra-heavy)
- **Body Font**: Space Grotesk (Regular to Bold weights)

### Components
- **Buttons**: 2px border, hard shadows, tactile click effect
- **Cards**: 2px border, 4px hard shadow, hover translate
- **Text**: Glitch effect on hover (±2px translation)
- **Cursor**: Custom white circle with difference blend mode

---

## 🐛 Troubleshooting

### Database Connection Error

**Error**: `Connection refused - Cannot open database connection`

**Solution**:
1. Check if MSSQL Server is running
2. Verify credentials in .env file
3. Ensure database exists:
   ```bash
   sqlcmd -S localhost -U sa -P your_sql_password -d TrafficManagementSystem
   ```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID {PID} /F
```

### CORS Error

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Ensure backend CORS is configured correctly
2. Check CLIENT_URL in backend .env
3. Verify frontend API_URL in .env

### React Module Not Found

**Error**: `Module not found: Can't resolve '@react-three/fiber'`

**Solution**:
```bash
cd frontend
npm install
npm start
```

### Database Schema Not Created

**Error**: `Invalid object name 'Users'`

**Solution**:
1. Open SSMS
2. Connect to TrafficManagementSystem
3. Paste and run database_schema.sql completely
4. Verify tables exist:
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
   ```

---

## 📦 File Checklist

### Backend Files
- ✅ server.js
- ✅ config/database.js
- ✅ controllers/authController.js
- ✅ controllers/challanController.js
- ✅ controllers/trafficController.js
- ✅ controllers/officerController.js
- ✅ controllers/reportController.js
- ✅ routes/auth.js
- ✅ routes/traffic.js
- ✅ routes/challan.js
- ✅ routes/officer.js
- ✅ routes/report.js
- ✅ middleware/auth.js
- ✅ middleware/errorHandler.js
- ✅ middleware/logging.js
- ✅ .env (with credentials)
- ✅ package.json

### Frontend Files
- ✅ App.jsx
- ✅ styles/neo-brutalist.css
- ✅ pages/LoginPage.jsx
- ✅ pages/OfficerDashboard.jsx
- ✅ context/AuthContext.jsx
- ✅ context/TrafficContext.jsx
- ✅ services/api.js
- ✅ hooks/useAuth.js
- ✅ components/common/* (all)
- ✅ components/traffic/* (all)
- ✅ components/3d/* (all)
- ✅ .env (with API URL)
- ✅ package.json

### Database Files
- ✅ database_schema.sql

---

## 🎓 Credit

**Produced by Sobaan**

Neo-Brutalist Design System Implementation
Traffic Management System with E-Challan
Real-Time Traffic Mapping & 3D Visualization
MSSQL Database with Full Integration
React Frontend with Modern Architecture

---

## 📞 Support

For issues or questions:
1. Check Troubleshooting section
2. Verify all files are in correct locations
3. Check console errors (both backend and frontend)
4. Ensure .env files have correct values
5. Run database verification scripts

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: Change the following before deploying to production:
- JWT_SECRET in .env
- Database password (sa)
- CORS origin settings
- API rate limiting
- Add HTTPS/SSL certificates
- Implement proper authentication
- Add encryption for sensitive data
- Enable SQL Server authentication only

---

## 📝 Next Steps

1. ✅ Complete database setup
2. ✅ Start backend server
3. ✅ Start frontend server
4. ✅ Test login with default credentials
5. ✅ Create new officer account
6. ✅ Issue test challan
7. ✅ Test traffic map
8. ✅ View 3D visualization
9. ✅ Generate reports
10. ✅ Deploy to production

---

**Happy Traffic Managing! 🚗**
