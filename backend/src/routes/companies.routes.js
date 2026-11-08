// Companies Routes [P2]
const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companies.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { companySchema, companyUpdateSchema } = require('../validators/coreSchemas');

const companyManagers = requireRole('OFFICER', 'ADMIN', 'RECRUITER');

router.get('/', requireAuth, companiesController.listManagedCompanies);
router.post('/', requireAuth, companyManagers, validate(companySchema), companiesController.createManagedCompany);
router.get('/:id', requireAuth, companiesController.getManagedCompany);
router.put('/:id', requireAuth, companyManagers, validate(companyUpdateSchema), companiesController.updateManagedCompany);
router.delete('/:id', requireAuth, companyManagers, companiesController.deleteManagedCompany);

module.exports = router;
