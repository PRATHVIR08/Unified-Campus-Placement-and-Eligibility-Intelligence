// Companies Routes [P2]
const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companies.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.get('/', requireAuth, companiesController.getAllCompanies);
router.post('/', requireAuth, requireRole('officer'), companiesController.createCompany);
router.get('/:id', requireAuth, companiesController.getCompanyById);

module.exports = router;
