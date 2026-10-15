// Offers Routes [P2]
const express = require('express');
const router = express.Router();
const offersController = require('../controllers/offers.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/my', requireAuth, requireRole('student'), offersController.getMyOffers);
router.post('/', requireAuth, requireRole('officer'), offersController.createOffer);
router.patch('/:id/decision', requireAuth, requireRole('student'), offersController.respondToOffer);
router.get('/all', requireAuth, requireRole('officer'), offersController.getAllOffers);

module.exports = router;
