const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    getProfit,
    getDailyReport,
    deleteDoneOrder
} = require('../controllers/overviewController.js')

const router = express.Router();

router.use(verifyToken)

router.get('/', getProfit);
router.get('/day', getDailyReport);
router.delete('/delete/done', deleteDoneOrder);

module.exports = router;
