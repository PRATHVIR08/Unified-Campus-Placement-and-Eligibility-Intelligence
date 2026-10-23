// Applications Routes [P2]
const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.post('/', requireAuth, requireRole('student'), applicationsController.applyToDrive);
router.get('/my', requireAuth, requireRole('student'), applicationsController.getMyApplications);
router.get('/drive/:driveId', requireAuth, requireRole('officer'), applicationsController.getDriveApplications);
router.patch('/:id/status', requireAuth, requireRole('student', 'officer'), applicationsController.updateStatus);

module.exports = router;
