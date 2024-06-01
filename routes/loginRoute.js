const express = require('express');
const { login, forgotPassword } = require('../controllers/loginController')
const router = express.Router();

router.post('/', login);
router.post('/forgot', forgotPassword);


module.exports = router;
