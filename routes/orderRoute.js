const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware')
const {
    createOrder,
    updateOrder,
    getAllOrders,
    getOrderById,
    filterOrdersByStatus,
    deleteOrder
} = require('../controllers/orderController');

router.use(verifyToken);

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/filter/:status', filterOrdersByStatus);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;
