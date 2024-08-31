const express = require('express');
const verifyToken = require('../middleware/authMiddleware.js')
const {
    getAllNotification
} = require('../controllers/notificationController.js')

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllNotification);

module.exports = router;
