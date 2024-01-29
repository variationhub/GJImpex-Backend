const Product = require('../models/productModel');

// Create Product
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating product' });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(productId, req.body, { new: true });
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating product' });
  }
};

// Get All Products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching products' });
  }
};

// Get Product by ID
const getProductById = async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching product' });
  }
};
  
// Delete Product
const deleteProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(deletedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting product' });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
};
