const Product = require('../models/productModel');
const { sendMessage } = require('../websocketHandler');

function sendMessageProductController() {
  const message = {
    DOMAIN: 'PRODUCT',
    INTENT: 'FETCHDATA'
  }
  sendMessage(message)
}

const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const stock = req.body.productPriceHistory.reduce((acc, curr) => {
      return acc + curr.stock;
    }, 0)

    const product = await Product.create({ ...productData, stock });
    sendMessageProductController()
    res.status(201).json({
      status: true,
      data: product,
      message: "Product created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message.split(":")[error.message.split(":").length - 1].trim()
    });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const product = await Product.findOne({ id });

    if (!product) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }

    Object.keys(updateData).forEach(key => {
      product[key] = updateData[key];
    });

    await product.save();
    sendMessageProductController()
    return res.json({
      status: true,
      data: product,
      message: "Product updated successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const updateProductStock = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body.productPriceHistory;

  try {
    const product = await Product.findOne({ id });

    const stock = updateData.reduce((acc, curr) => {
      return acc + curr.stock;
    }, product.stock)

    if (!product) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }
    product.stock = stock;
    product.productPriceHistory = [...product.productPriceHistory, ...updateData]
    await product.save();
    sendMessageProductController()
    return res.json({
      status: true,
      data: product,
      message: "Product stock updated successfully"
    });
  }
  catch (error) {
    return res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
}

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}, { "_id": 0, "updatedAt": 0, "createdAt": 0 });
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
  const { id } = req.params;
  try {
    const product = await Product.findOne({ id }, { "_id": 0, "updatedAt": 0, "createdAt": 0 });
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
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findOneAndDelete({ id });

    if (!deletedProduct) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }
    sendMessageProductController()
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
  updateProductStock,
  getAllProducts,
  getProductById,
  deleteProduct,
};
