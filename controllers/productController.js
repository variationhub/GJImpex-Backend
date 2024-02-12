const Product = require('../models/productModel');

const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const product = await Product.create(productData);
    res.status(201).json({
      status: true,
      data: product,
      message: "Product created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(productId, req.body, { new: true });
    res.json({
      status: true,
      data: updatedProduct,
      message: "Product updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json({
      status: true,
      data: products,
      message: "Products fetch successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error updating product'
    });
  }
};

const getProductById = async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }
    res.json({
      status: true,
      data: product,
      message: "Product found successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error fetching product'
    });
  }
};
  
const deleteProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }
    res.json({
      status: true,
      data: deletedProduct,
      message: "Product delete successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error deleting product'
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
};
