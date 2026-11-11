const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/verify-portal', requireAuth, authController.verifyPortal);

module.exports = router;
