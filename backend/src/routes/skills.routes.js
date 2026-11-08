const express = require('express');
const router = express.Router();
const skillsController = require('../controllers/skills.controller');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, skillsController.list);

module.exports = router;
