# Traffic Management System

Full-stack Traffic Management and E-Challan platform with officer operations, public challan lookup, registered citizen accounts, appeals, payments, Google Maps, Gemini AI assistance, notifications, activity history, and an admin control dashboard.

## What This Project Does

- Public visitors can view live road situations, open Google Maps traffic markers, and check challans without logging in.
- Citizens can register with NIC and vehicle number, then access a private dashboard with challan history, payment status charts, maps, payments, appeals, subscriptions, and profile settings.
- Officers can add violations, generate challans, report road situations, review appeals, print/view challans, use AI autofill, and monitor activity.
- Admins have a separate dashboard to manage officers, citizens, admins, users, reports, challan history, paid/unpaid charts, appeal status, traffic reports, and audit activity.
- Gemini powers the chatbot and AI explanation features, with backend fallback responses if Gemini is unavailable.

## Technology Stack

| Layer | Details |
|---|---|
| Frontend | React 18, React Router, Axios, Recharts, Three.js, React Three Fiber, Google Map React |
| Backend | Node.js, Express.js, JWT auth, bcrypt password hashing, Helmet, CORS, MSSQL driver |
| Database | Microsoft SQL Server with core traffic tables plus dynamic public, appeal, notification, and activity tables |
| Maps | Google Maps JavaScript API through `google-map-react`; backend can also use Google Maps API keys for location support |
| AI | Gemini 2.5 Flash through backend `/api/chatbot/ask` |
| UI | Custom responsive civic dashboard interface with charts, maps, 3D scene, command panels, and mobile layouts |

## Main Frontend Pages

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Landing/control overview, feature list, technology stack |
| Login | `/login` | Officer/admin login with role-based redirect |
| Public Portal | `/public` | Open traffic map, stats, public charts, latest alerts |
| Public Challan Tracker | `/public/challan-tracker` | Anonymous vehicle challan lookup and payment flow |
| Public Traffic Info | `/public/traffic-info` | Full public road situation view with map markers |
| Citizen Account | `/public/account` | Citizen login/register and private dashboard |
| Officer Dashboard | `/officer-dashboard` | Officer stats, violations, challans, appeals, maps, 3D scene |
| Traffic Dashboard | `/traffic-dashboard` | Officer traffic management view |
| Challan Management | `/challan-management` | Challan operations page |
| Reports | `/reports` | Officer report links and summaries |
| Admin Dashboard | `/admin-dashboard` | Admin-only management, reports, charts, users, histories |

## Frontend Structure

```text
frontend/src
  components/
    3d/TrafficScene3D.jsx
    auth/AuthGuard.jsx
    common/Header.jsx
    common/GeminiChatbot.jsx
    dashboard/ChallanList.jsx
  hooks/useAuth.js
  pages/
    AdminDashboard.jsx
    OfficerDashboard.jsx
    HomePage.jsx
    LoginPage.jsx
    public/PublicHome.jsx
    public/PublicAccount.jsx
    public/ChallanTracker.jsx
    public/TrafficInfo.jsx
  services/api.js
```

The frontend talks to the backend through `frontend/src/services/api.js`. In development, `frontend/package.json` also proxies requests to `http://localhost:5000`.

## Backend Structure

```text
backend
  server.js
  config/database.js
  controllers/
    authController.js
    publicController.js
    adminController.js
    challanController.js
    violationController.js
    trafficController.js
    chatbotController.js
    notificationController.js
    activityController.js
  routes/
    auth.js
    public.js
    admin.js
    challan.js
    violation.js
    traffic.js
    chatbot.js
    notification.js
    activity.js
  utils/systemEvents.js
```

`backend/server.js` creates the Express app, connects middleware, mounts API routes under `/api`, exposes `/api/health`, and starts the server on `PORT` from `.env`.

## Backend Flow

1. Frontend sends requests with Axios.
2. Auth-protected routes use JWT from local storage.
3. Express routes forward requests to controllers.
4. Controllers call `executeQuery` from `backend/config/database.js`.
5. SQL Server returns records.
6. Controllers normalize responses as `{ success, data, message }`.
7. Notification and activity helpers write audit events when important workflow actions happen.

## API Endpoints

### Health

```text
GET /api/health
```

Checks if the backend server is alive.

### Auth

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
PUT  /api/auth/profile
POST /api/auth/change-password
```

Used for officer/admin login, profile retrieval, profile edits, and password changes.

### Public and Citizen

```text
POST   /api/public/register
GET    /api/public/me
PUT    /api/public/me
GET    /api/public/challan/:challanNumber
GET    /api/public/vehicle/:registrationNumber
POST   /api/public/vehicle/:registrationNumber/payment
GET    /api/public/appeals
POST   /api/public/appeals
GET    /api/public/subscriptions
POST   /api/public/subscriptions
DELETE /api/public/subscriptions/:subscriptionId
```

This group powers anonymous challan lookup, registered citizen dashboards, payments, appeals, optional evidence upload data, alert subscriptions, and citizen profile updates.

### Officer Appeals

```text
GET /api/public/officer/appeals
PUT /api/public/officer/appeals/:appealId
```

Officers receive all citizen appeals. Approval changes the appeal state and waives/settles the challan for the citizen display. Rejection keeps the challan active.

### Traffic

```text
GET  /api/traffic/situations
POST /api/traffic/situations
```

Public pages read traffic situations. Officers create road situation reports with severity, description, location, and coordinates.

### Challans

```text
GET /api/challans
GET /api/challans/stats/summary
```

Officer/admin dashboards use these for recent challans, paid/unpaid status, revenue totals, and report cards.

### Violations

```text
POST /api/violations/officer-add
```

Creates a violation and generates a challan record for the vehicle.

### Admin

```text
GET  /api/admin/overview
GET  /api/admin/search?q=term
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:userId
PUT  /api/admin/users/:userId/active
```

The admin overview returns user counts, challan reports, paid/unpaid totals, charts, appeal summaries, traffic counts, recent history, and activity. User endpoints allow creating and editing Admin, Officer, Public, and Supervisor accounts.

### Notifications and Activity

```text
GET /api/notifications
PUT /api/notifications/read
GET /api/activity
```

Notifications appear in the header. Activity logs power officer/admin history panels.

### Gemini Chatbot

```text
POST /api/chatbot/ask
```

Request body:

```json
{
  "message": "How do I pay a challan?",
  "history": [],
  "context": {
    "path": "/public/account",
    "role": "Public"
  }
}
```

The backend calls Gemini 2.5 Flash when configured. If Gemini fails, it returns a local traffic-system help response.

## Database Tables

Core database tables from the SQL schema:

- `Users`
- `Officers`
- `Vehicles`
- `Locations`
- `Violations`
- `Challans`
- `TrafficSituations`

Dynamic feature tables created/used by backend features:

- `PublicUserProfiles`
- `PublicChallanAppeals`
- `PublicAlertSubscriptions`
- `Notifications`
- `ActivityLogs`

Important relationships:

- `Users.Role` controls routing and permissions.
- Public citizens link to `PublicUserProfiles` by `UserID`.
- Public profiles store NIC and vehicle number.
- Challans link vehicle, violation, location, payment status, and issue date.
- Appeals link citizen, vehicle, challan number, status, officer note, and optional evidence data.
- Notifications target a user and are marked read by the header.
- Activity logs store system history for admin/officer review.

## Environment Variables

Create `backend/.env`:

```env
DB_SERVER=localhost
DB_NAME=TrafficManagementSystem
DB_USER=sa
DB_PASSWORD=your_sql_password
DB_PORT=1433
NODE_ENV=development
PORT=5000
HOST=localhost
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:3000
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Never commit real API keys, SQL passwords, or production JWT secrets.

## Setup

Install dependencies:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Create the SQL Server database:

```text
database/database_schema.sql
```

Start both servers on Windows:

```bat
START_SERVERS.bat
```

Or start manually:

```bash
cd backend
npm start
```

```bash
cd frontend
npm start
```

URLs:

```text
Backend:  http://localhost:5000
Frontend: http://localhost:3000
Health:   http://localhost:5000/api/health
```

## Demo Accounts

Officer seed accounts commonly include:

| Username | Password |
|---|---|
| `officer1` | `password123` |
| `officer2` | `password123` |
| `officer3` | `password123` |

Admin account used during development:

| Username | Password |
|---|---|
| `admin` | `admin123` |

If your database was reseeded, create or update an admin user with `Role = 'Admin'`.

## Recommended Demo Flow

1. Open `/`.
2. Open `/public` and confirm traffic map, public charts, latest alerts, and services load.
3. Open `/public/challan-tracker` and search a vehicle number.
4. Register a citizen at `/public/account` with NIC and vehicle number.
5. Check citizen charts: payment status, challan history, and appeal status.
6. Submit an appeal with or without evidence.
7. Login as an officer and open `/officer-dashboard`.
8. Review the appeal from the appeals inbox.
9. Approve, reject, or request more information.
10. View/print recent challans.
11. Report a road situation and confirm it appears in the public map.
12. Login as admin and open `/admin-dashboard`.
13. Review paid/unpaid graphs, challan history, users, reports, and activity.

## Final Feature Checklist

- Public dashboard with Google Maps and Recharts analytics.
- Citizen dashboard with NIC/vehicle registration, payments, appeals, subscriptions, maps, and charts.
- Officer dashboard with real challan data, appeal review, AI tools, print/view actions, and 3D visualization.
- Admin dashboard separated from officer dashboard, with full user management and report charts.
- Header date/time, notification bell, and role-aware navigation.
- Gemini chatbot with helpful fallback behavior.
- SQL Server-backed traffic, challan, appeal, notification, and activity workflows.
- README and environment documentation updated for final delivery.
