const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    createTransport,
    updateTransport,
    getAllTransport,
    getTransport,
    deleteTransport
} = require('../controllers/transportController')
const router = express.Router();

router.use(verifyToken)

router.post('/', createTransport);
router.put('/:id', updateTransport);
router.get('/', getAllTransport);
router.get('/:id', getTransport);
router.delete('/:id', deleteTransport);

module.exports = router;
