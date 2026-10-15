// Express Application Setup [P2]
// Responsibilities: Attach core middleware (cors, json), mount route groups, attach global error handler

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

app.use(cors());
app.use(express.json());

// API Base Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/drives', jobDrivesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/interviews', interviewRoundsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/reports', reportsRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
