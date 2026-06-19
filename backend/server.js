const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { initializePool } = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');
const challanRoutes = require('./routes/challan');
const officerRoutes = require('./routes/officer');
const reportRoutes = require('./routes/report');
const publicRoutes = require('./routes/public');
const violationRoutes = require('./routes/violation');
const chatbotRoutes = require('./routes/chatbot');
const notificationRoutes = require('./routes/notification');
const activityRoutes = require('./routes/activity');
const adminRoutes = require('./routes/admin');
const smartRoutes = require('./routes/smart');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logging');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalNetworkOrigin = (origin) => {
  if (!origin) return true;

  try {
    const { hostname, port, protocol } = new URL(origin);
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const isFrontendPort = !port || port === '3000';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateIp =
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    return isHttp && isFrontendPort && (isLocalHost || isPrivateIp);
  } catch {
    return false;
  }
};

app.use(cors({
  origin(origin, callback) {
    if (allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/smart', smartRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    await initializePool();
    app.listen(PORT, HOST, () => {
      console.log(`
╔════════════════════════════════════════╗
║   TRAFFIC MANAGEMENT SYSTEM - SERVER   ║
╚════════════════════════════════════════╝
🚗 Server: http://${HOST}:${PORT}
📊 API:    http://${HOST}:${PORT}/api
✅ Ready!
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => process.exit(0));

module.exports = app;
