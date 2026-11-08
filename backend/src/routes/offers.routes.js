// Offers Routes [P2]
const express = require('express');
const router = express.Router();
const offersController = require('../controllers/offers.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  offerSchema,
  offerDecisionSchema,
  offerStatusSchema,
} = require('../validators/coreSchemas');

router.get('/me', requireAuth, requireRole('STUDENT'), offersController.getMyOffers);
router.get('/my', requireAuth, requireRole('student'), offersController.getMyOffers);
router.patch('/:id/status', requireAuth, requireRole('STUDENT', 'OFFICER', 'ADMIN'), validate(offerStatusSchema), offersController.updateStatus);
router.post('/', requireAuth, requireRole('OFFICER', 'ADMIN'), validate(offerSchema), offersController.createOffer);
router.patch('/:id/decision', requireAuth, requireRole('STUDENT'), validate(offerDecisionSchema), offersController.respondToOffer);
router.get('/all', requireAuth, requireRole('OFFICER', 'ADMIN'), offersController.getAllOffers);

module.exports = router;
