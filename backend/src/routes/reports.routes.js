// Reports Routes [P2]
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/department-summary', requireAuth, requireRole('OFFICER', 'ADMIN'), reportsController.getDepartmentSummary);
router.get('/funnel-metrics', requireAuth, requireRole('OFFICER', 'ADMIN'), reportsController.getFunnelMetrics);
router.get('/placement-summary', requireAuth, requireRole('OFFICER', 'ADMIN'), reportsController.getPlacementSummary);
router.get('/export/drive/:driveId', requireAuth, requireRole('OFFICER', 'ADMIN'), reportsController.exportDriveApplicantsCsv);
router.get('/:name', requireAuth, requireRole('OFFICER', 'ADMIN'), reportsController.getNamedReport);

module.exports = router;
