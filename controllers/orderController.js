const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// Create Order
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    const total = req.body.orders.reduce((acc, curr) => {
      return acc + curr.quantity * curr.sellPrice;
    }, 0);

    const order = await Order.create({ ...orderData, totalPrice: total });

    await Promise.all(orderData.orders.map(async (orderItem) => {
      const product = await Product.findOne({ name: orderItem.productName });
      if (!product) {
        throw new Error(`Product with ID ${orderItem.productName} not found.`);
      }
      product.stock -= orderItem.quantity;
      await product.save();
    }));

    res.json({
      status: 200,
      data: order,
      message: "Order created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

// Update Order
const updateOrder = async (req, res) => {
  const orderId = req.params.id;
  try {

    const originalOrder = await Order.findById(orderId);

    const quantityChanges = {};

    originalOrder.orders.forEach((originalItem) => {
      const updatedItem = req.body.orders.find((updatedItem) => updatedItem.productName === originalItem.productName);
      if (updatedItem) {
        const quantityDifference = updatedItem.quantity - originalItem.quantity;
        quantityChanges[originalItem.productName] = quantityDifference;
      }
    });

    const updatedOrder = await Order.findByIdAndUpdate(orderId, req.body, { new: true });

    await Promise.all(Object.keys(quantityChanges).map(async (productName) => {
      const product = await Product.findOne({ name: productName });
      if (!product) {
        throw new Error(`Product with name ${productName} not found.`);
      }
      product.stock -= quantityChanges[productName];
      await product.save();
    }));

    res.json({
      status: true,
      data: updatedOrder,
      message: "Order updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};


// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json({
      status: true,
      data: orders,
      message: "Orders fetch successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error fetching orders'
    });
  }
};

// Get Order by ID
const getOrderById = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }
    res.json({
      status: true,
      data: order,
      message: "Order found successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error fetching order'
    });
  }
};

const filterOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const filteredOrders = await Order.find({ status });
    res.json({
      status: true,
      data: filteredOrders,
      message: "Orders fetched successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error fetching orders'
    });
  }
};

// Delete Order
const deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }
    res.json({
      status: true,
      data: deletedOrder,
      message: "Order deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error deleting order'
    });
  }
};

module.exports = {
  createOrder,
  updateOrder,
  getAllOrders,
  getOrderById,
  filterOrdersByStatus,
  deleteOrder,
};
