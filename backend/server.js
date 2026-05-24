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

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logging');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
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
