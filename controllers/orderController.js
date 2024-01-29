const Order = require('../models/orderModel');

// Create Order
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const order = await Order.create(orderData);
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating order' });
  }
};

// Update Order
const updateOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, req.body, { new: true });
    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating order' });
  }
};

// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
};

// Get Order by ID
const getOrderById = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching order' });
  }
};

const filterOrdersByStatus = async (req, res) => {
    try {
      const { status } = req.params;
      const filteredOrders = await Order.find({ status });
      res.json(filteredOrders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error filtering Orders by status' });
    }
  };

// Delete Order
const deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(deletedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting order' });
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
