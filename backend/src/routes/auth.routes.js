const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');
const { requireSupabaseAuth } = require('../middleware/requireAuth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/provision', requireSupabaseAuth, authController.provisionStudent);

module.exports = router;
