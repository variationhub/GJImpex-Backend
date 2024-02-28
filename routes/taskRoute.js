const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    createTask,
    updateTask,
    getAllTask,
    getTask,
    deleteTask
} = require('../controllers/taskController.js')

const router = express.Router();

router.use(verifyToken)

router.post('/', createTask);
router.put('/:id', updateTask);
router.get('/', getAllTask);
router.get('/:id', getTask);
router.delete('/:id', deleteTask);

module.exports = router;
