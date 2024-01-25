const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Create a new user (Only for admin)
router.post('/', userController.createUser);

// User login
router.post('/login', userController.loginUser);

module.exports = router;
