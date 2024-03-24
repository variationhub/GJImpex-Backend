const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware')
const {
    createProduct,
    updateProduct,
    getAllProducts,
    getProductById,
    deleteProduct,
    updateProductStock
} = require('../controllers/productController');

router.use(verifyToken);

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.put('/:id/stock', updateProductStock);
router.delete('/:id', deleteProduct);

module.exports = router;
