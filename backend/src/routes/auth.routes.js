// Authentication Routes [P2]
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Public authentication endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);

module.exports = router;
