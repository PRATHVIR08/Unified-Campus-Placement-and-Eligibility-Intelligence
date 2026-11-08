// Interview Rounds Routes [P2]
const express = require('express');
const router = express.Router();
const interviewRoundsController = require('../controllers/interviewRounds.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  interviewRoundSchema,
  interviewAttendanceSchema,
  interviewResultSchema,
  interviewRoundUpdateSchema,
} = require('../validators/coreSchemas');

router.get('/drive/:driveId', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), interviewRoundsController.getRoundsByDrive);
router.patch('/:id', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), validate(interviewRoundUpdateSchema), interviewRoundsController.updateApplicationRound);
router.post('/', requireAuth, requireRole('OFFICER', 'ADMIN'), validate(interviewRoundSchema), interviewRoundsController.createRound);
router.post('/participants/attendance', requireAuth, requireRole('OFFICER', 'ADMIN'), validate(interviewAttendanceSchema), interviewRoundsController.recordAttendance);
router.post('/participants/result', requireAuth, requireRole('OFFICER', 'ADMIN'), validate(interviewResultSchema), interviewRoundsController.recordResult);

module.exports = router;
