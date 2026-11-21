// Express Application Setup [P2]

const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Route imports
const authRoutes = require('./routes/auth.routes');
const studentsRoutes = require('./routes/students.routes');
const companiesRoutes = require('./routes/companies.routes');
const jobDrivesRoutes = require('./routes/jobDrives.routes');
const applicationsRoutes = require('./routes/applications.routes');
const interviewRoundsRoutes = require('./routes/interviewRounds.routes');
const offersRoutes = require('./routes/offers.routes');
const reportsRoutes = require('./routes/reports.routes');
const skillsRoutes = require('./routes/skills.routes');
const adminRoutes = require('./routes/admin.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();
const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests; please try again later' },
});

// Core middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.frontendOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, 'Origin is not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeRateLimit(req, res, next);
  }
  return next();
});

// Health check endpoint
const db = require('./db/pool');

app.get('/api/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({ success: true, message: 'Backend and database are healthy' });
  } catch (error) {
    return next(error);
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/job-drives', jobDrivesRoutes);
app.use('/api/drives', jobDrivesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/interviews', interviewRoundsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use((req, res, next) => next(new AppError(404, 'Route not found')));

// Global error handler (keep last)
app.use(errorHandler);

module.exports = app;