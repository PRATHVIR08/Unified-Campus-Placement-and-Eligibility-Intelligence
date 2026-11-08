const express = require('express');
const router = express.Router();
const controller = require('../controllers/studentFilters.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  studentFilterCreateSchema,
  studentFilterUpdateSchema,
} = require('../validators/coreSchemas');

router.get('/', requireAuth, requireRole('STUDENT'), controller.list);
router.post('/', requireAuth, requireRole('STUDENT'), validate(studentFilterCreateSchema), controller.create);
router.put('/:id', requireAuth, requireRole('STUDENT'), validate(studentFilterUpdateSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('STUDENT'), controller.remove);

module.exports = router;
