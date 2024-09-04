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
    updateOrderStatus,
    updateOrderDetails,
    getAllDeletedOrders
} = require('../controllers/orderController');
const paginationMiddleware = require('../middleware/paginationMiddleware');

router.use(verifyToken);

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/filter/:status', paginationMiddleware, filterOrdersByStatus);
router.get('/deleted/all', getAllDeletedOrders)
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.put('/:id/status', updateOrderStatus);
router.put('/change/:orderId', updateOrderDetails)
router.delete('/:id', deleteOrder);

module.exports = router;
