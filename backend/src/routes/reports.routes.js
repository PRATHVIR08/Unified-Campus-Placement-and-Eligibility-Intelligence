// Reports Routes [P2]
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/department-summary', requireAuth, requireRole('officer'), reportsController.getDepartmentSummary);
router.get('/funnel-metrics', requireAuth, requireRole('officer'), reportsController.getFunnelMetrics);
router.get('/export/drive/:driveId', requireAuth, requireRole('officer'), reportsController.exportDriveApplicantsCsv);

module.exports = router;
