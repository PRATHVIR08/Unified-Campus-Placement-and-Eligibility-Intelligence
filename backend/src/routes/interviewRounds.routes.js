// Interview Rounds Routes [P2]
const express = require('express');
const router = express.Router();
const interviewRoundsController = require('../controllers/interviewRounds.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/drive/:driveId', requireAuth, interviewRoundsController.getRoundsByDrive);
router.post('/', requireAuth, requireRole('officer'), interviewRoundsController.createRound);
router.post('/participants/attendance', requireAuth, requireRole('officer'), interviewRoundsController.recordAttendance);
router.post('/participants/result', requireAuth, requireRole('officer'), interviewRoundsController.recordResult);

module.exports = router;
