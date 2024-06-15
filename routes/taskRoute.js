const express = require('express');
const verifyToken = require('../middleware/authMiddleware')
const {
    createTask,
    updateTask,
    updateTaskDoneStatus,
    getTasks,
    getTaskById,
    deleteTask
} = require('../controllers/taskController.js')

const router = express.Router();

router.use(verifyToken)

router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id', updateTaskDoneStatus);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.delete('/:id', deleteTask);

module.exports = router;
