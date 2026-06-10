const express = require('express');
const router  = express.Router();
const { getCurrencyRates } = require('../controllers/currencyController');

// Public — no auth required
router.get('/rates', getCurrencyRates);

module.exports = router;
