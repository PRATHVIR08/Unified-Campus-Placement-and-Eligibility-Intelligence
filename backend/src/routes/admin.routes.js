const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { adminRoleSchema } = require('../validators/coreSchemas');

router.get('/users', requireAuth, requireRole('ADMIN'), adminController.listUsers);
router.patch('/users/:id/role', requireAuth, requireRole('ADMIN'), validate(adminRoleSchema), adminController.updateRole);

module.exports = router;
