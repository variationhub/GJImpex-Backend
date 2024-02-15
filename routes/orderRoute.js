const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware')
const {
    createOrder,
    updateOrder,
    getAllOrders,
    getOrderById,
    filterOrdersByStatus,
    deleteOrder,
    updateOrderStatus
} = require('../controllers/orderController');

router.use(verifyToken);

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/filter/:status', filterOrdersByStatus);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);

module.exports = router;
