const express = require('express');
const router  = express.Router();
const { getProviderProfile } = require('../controllers/providerController');

// Public route — no auth needed
router.get('/:id', getProviderProfile);

module.exports = router;
