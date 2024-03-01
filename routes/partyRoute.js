const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    createParty,
    updateParty,
    getAllParty,
    getParty,
    deleteParty
} = require('../controllers/partyController.js')

const router = express.Router();

router.use(verifyToken)

router.post('/', createParty);
router.put('/:id', updateParty);
router.get('/', getAllParty);
router.get('/:id', getParty);
router.delete('/:id', deleteParty);

module.exports = router;