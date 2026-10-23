// Express Application Setup [P2]

const express = require('express');
const cors = require('cors');

// Route imports
const authRoutes = require('./routes/auth.routes');
const studentsRoutes = require('./routes/students.routes');
const companiesRoutes = require('./routes/companies.routes');
const jobDrivesRoutes = require('./routes/jobDrives.routes');
const applicationsRoutes = require('./routes/applications.routes');
const interviewRoundsRoutes = require('./routes/interviewRounds.routes');
const offersRoutes = require('./routes/offers.routes');
const reportsRoutes = require('./routes/reports.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running!',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/drives', jobDrivesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/interviews', interviewRoundsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/reports', reportsRoutes);

// Global error handler (keep last)
app.use(errorHandler);

module.exports = app;