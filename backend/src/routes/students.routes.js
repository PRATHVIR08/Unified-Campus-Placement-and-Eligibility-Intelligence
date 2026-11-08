// Students Routes [P2]
const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/students.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { studentProfileSchema, legacyStudentProfileSchema } = require('../validators/coreSchemas');
const studentFiltersRoutes = require('./studentFilters.routes');

router.use('/me/filters', studentFiltersRoutes);
router.get('/me', requireAuth, requireRole('STUDENT'), studentsController.getMe);
router.put('/me', requireAuth, requireRole('STUDENT'), validate(studentProfileSchema), studentsController.updateMe);
router.get('/', requireAuth, requireRole('OFFICER', 'ADMIN'), studentsController.listStudents);
router.get('/profile', requireAuth, requireRole('STUDENT'), studentsController.getProfile);
router.put('/profile', requireAuth, requireRole('STUDENT'), validate(legacyStudentProfileSchema), studentsController.updateProfile);

module.exports = router;
