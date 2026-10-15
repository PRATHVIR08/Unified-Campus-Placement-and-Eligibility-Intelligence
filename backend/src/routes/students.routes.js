// Students Routes [P2]
const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/students.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/profile', requireAuth, studentsController.getProfile);
router.put('/profile', requireAuth, requireRole('student'), studentsController.updateProfile);
router.get('/', requireAuth, requireRole('officer'), studentsController.getAllStudents);

module.exports = router;
