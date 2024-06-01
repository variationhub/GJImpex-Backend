const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware')
const {
    createUser,
    updateUser,
    getAllUsers,
    getUserById,
    deleteUser,
    changePassword
} = require('../controllers/userController');

router.use(verifyToken);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/change/password', changePassword);
router.delete('/:id', deleteUser);

module.exports = router;
