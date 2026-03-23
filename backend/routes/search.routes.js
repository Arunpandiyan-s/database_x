/**
 * Search Routes
 * GET /api/v1/search?query=&scope=students|staff|all
 */

const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

router.get('/', authorizeRoles(...SUPPORTED_ROLES), SearchController.search);

module.exports = router;
