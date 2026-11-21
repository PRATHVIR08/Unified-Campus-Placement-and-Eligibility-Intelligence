const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const chatbotController = require('../controllers/chatbot.controller');
const chatbotRateLimit = require('../middleware/chatbotRateLimit');

const router = express.Router();

router.post(
  '/ask',
  requireAuth,
  requireRole('STUDENT', 'OFFICER', 'ADMIN'),
  chatbotRateLimit,
  chatbotController.ask
);

module.exports = router;
