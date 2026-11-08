// Applications Routes [P2]
const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { applicationStatusSchema } = require('../validators/coreSchemas');
const {
  applicationInterviewRoundSchema,
  applicationOfferSchema,
} = require('../validators/coreSchemas');
const interviewRoundsController = require('../controllers/interviewRounds.controller');
const offersController = require('../controllers/offers.controller');

router.post('/', requireAuth, requireRole('student'), applicationsController.applyToDrive);
router.get('/:id/interview-rounds', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), interviewRoundsController.getApplicationRounds);
router.post('/:id/interview-rounds', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), validate(applicationInterviewRoundSchema), interviewRoundsController.createApplicationRound);
router.post('/:id/offers', requireAuth, requireRole('OFFICER', 'ADMIN'), validate(applicationOfferSchema), offersController.createApplicationOffer);
router.get('/me', requireAuth, requireRole('STUDENT'), applicationsController.getMyApplications);
router.get('/my', requireAuth, requireRole('student'), applicationsController.getMyApplications);
router.get('/drive/:driveId', requireAuth, requireRole('OFFICER', 'ADMIN', 'RECRUITER'), applicationsController.getDriveApplications);
router.patch('/:id/status', requireAuth, requireRole('STUDENT', 'OFFICER', 'ADMIN'), validate(applicationStatusSchema), applicationsController.updateStatus);

module.exports = router;
