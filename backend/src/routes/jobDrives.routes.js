// Job Drives Routes [P2]
const express = require('express');
const router = express.Router();
const jobDrivesController = require('../controllers/jobDrives.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/', requireAuth, jobDrivesController.getAllDrives);
router.get('/:id', requireAuth, jobDrivesController.getDriveById);
router.post('/', requireAuth, requireRole('officer'), jobDrivesController.createDrive);
router.put('/:id', requireAuth, requireRole('officer'), jobDrivesController.updateDrive);
router.patch('/:id/status', requireAuth, requireRole('officer'), jobDrivesController.updateDriveStatus);

module.exports = router;
