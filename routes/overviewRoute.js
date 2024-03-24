const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    getProfit
} = require('../controllers/overviewController.js')

const router = express.Router();

router.use(verifyToken)

router.get('/', getProfit);

module.exports = router;
