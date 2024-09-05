const express = require('express');
const verifyToken = require('../middleware/authMiddleware.js')
const {
    getAllNotification
} = require('../controllers/notificationController.js')
const paginationMiddleware = require('../middleware/paginationMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/', paginationMiddleware, getAllNotification);

module.exports = router;