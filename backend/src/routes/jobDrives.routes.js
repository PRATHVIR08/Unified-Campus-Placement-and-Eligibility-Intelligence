// Job Drives Routes [P2]
const express = require('express');
const router = express.Router();
const jobDrivesController = require('../controllers/jobDrives.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/', requireAuth, jobDrivesController.getAllDrives);
router.get('/filter-options', requireAuth, jobDrivesController.getFilterOptions);
router.post('/:id/applications', requireAuth, requireRole('STUDENT'), jobDrivesController.applyToDrive);
router.get('/:id/applications', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), jobDrivesController.getDriveApplications);
router.get('/:id/eligibility', requireAuth, requireRole('STUDENT'), jobDrivesController.getEligibility);
router.get('/:id', requireAuth, jobDrivesController.getDriveById);
router.post('/', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), jobDrivesController.createDrive);
router.put('/:id', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), jobDrivesController.updateDrive);
router.patch('/:id/status', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), jobDrivesController.updateDriveStatus);
router.delete('/:id', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), jobDrivesController.deleteDrive);

module.exports = router;
