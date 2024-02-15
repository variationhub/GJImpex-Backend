const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// Create Order
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const userId = req.user._id;

    const total = req.body.orders.reduce((acc, curr) => {
      return Number(acc) + (Number(curr.quantity) * Number(curr.sellPrice));
    }, Number(Number(orderData.gstPrice) / Number(orderData.gst)).toFixed(0));

    const order = await Order.create({ ...orderData, userId, totalPrice: total });

    await Promise.all(orderData.orders.map(async (orderItem) => {
      const product = await Product.findOne({ productName: orderItem.productName });
      if (!product) {
        throw new Error(`Product with ID ${orderItem.productName} not found.`);
      }
      product.stock -= orderItem.quantity;
      await product.save();
    }));

    res.json({
      status: true,
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
      const product = await Product.findOne({ productName: productName });
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

const updateOrderStatus = async (req, res) => {
  const orderId = req.params.id;
  const { billed, dispatched, LR } = req.query;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    // Update order status based on provided query parameters
    if (billed !== undefined) {
      order.billed = billed === 'true';
    }
    if (dispatched !== undefined) {
      order.dispatched = dispatched === 'true';
    }
    if (LR !== undefined) {
      order.LR = LR === 'true';
    }

    let newStatus = "pending";

    if (order.billed || order.dispatched) {
      newStatus = "dispatching and billing";
      if (order.billed && order.dispatched) {
        newStatus = "LR pending";
        if (order.LR) {
          newStatus = "done";
        }
      }
    }

    order.status = newStatus;
    await order.save();

    res.json({
      status: true,
      data: order,
      message: "Order status updated"
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
  updateOrderStatus
};
