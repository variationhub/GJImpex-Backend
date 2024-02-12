const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware')
const {
    createUser,
    updateUser,
    getAllUsers,
    getUserById,
    deleteUser
} = require('../controllers/userController');

router.use(verifyToken);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
