const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    createConversation,
    getAllConversation,
} = require('../controllers/conversationController.js')

const router = express.Router();

router.use(verifyToken)

router.post('/', createConversation);
router.get('/:roomId', getAllConversation);

module.exports = router;