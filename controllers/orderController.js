const { OrderModel } = require('../models/orderModel');
const Product = require('../models/productModel');
const { sendMessage } = require('../websocketHandler');

function sendMessageOrderController() {
  const message = {
    DOMAIN: 'ORDER',
    INTENT: 'FETCHDATA'
  }
  sendMessage(message)
}

const createOrder = async (req, res) => {

  const orderData = req.body;
  const userId = req.user.id;

  try {

    let totalPrice = Number(orderData?.freight) || 0;

    const productData = await Product.find();

    await Promise.all(orderData.orders.map(async (order, index) => {

      const product = productData.find(item => item.id === order.productId);
      orderData.orders[index] = { ...order, buyPrice: product.price }
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }
      product.stock -= order.quantity;

      totalPrice += order.sellPrice * order.quantity;

    }));

    await Promise.all(productData.map(async (product) => {
      await product.save();
    }));

    if (orderData.gstPrice) {
      if (orderData.gst) {
        totalPrice += Number((orderData.gstPrice * (orderData.gst / 100)).toFixed(0));
      } else {
        totalPrice += orderData.gstPrice;
      }
    }

    const newOrder = new OrderModel({ ...orderData, totalPrice, userId });

    await newOrder.save();
    sendMessageOrderController()
    res.json({
      status: true,
      data: newOrder,
      message: "Order created successfully"
    });
  } catch (error) {

    await Promise.all(orderData.orders.map(async (order) => {
      const product = await Product.findOne({ id: order.productId });
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }
      product.stock += Number(order.quantity);
      await product.save();

    }));

    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

// Update Order
const updateOrder = async (req, res) => {
  const { id } = req.params;
  const orderData = req.body;

  try {
    const existingOrder = await OrderModel.findOne({ id });

    if (!existingOrder) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    let totalPriceDifference = 0;

    existingOrder.orders.forEach((order, index) => {
      const newOrder = orderData.orders.find(o => o.productId === order.productId);
      orderData.orders[index] = { ...orderData.orders[index], buyPrice: order.price }
      if (!newOrder) {
        totalPriceDifference -= order.sellPrice * order.quantity;
      } else {
        totalPriceDifference += (newOrder.sellPrice - order.sellPrice) * (newOrder.quantity - order.quantity);
      }
    });

    await Promise.all(existingOrder.orders.map(async (order) => {
      const product = await Product.findOne({ id: order.productId });
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }
      product.stock += order.quantity;
      const newOrder = orderData.orders.find(o => o.productId === order.productId);
      if (newOrder) {
        product.stock -= newOrder.quantity;
      }
      await product.save();
    }));

    const existingProductIds = existingOrder.orders.map(order => order.productId);
    const newProducts = orderData.orders.filter(order => !existingProductIds.includes(order.productId));
    await Promise.all(newProducts.map(async (newProduct) => {
      const product = await Product.findOne({ id: newProduct.productId });

      if (!product) {
        throw new Error(`Product with ID ${newProduct.productId} not found.`);
      }
      product.stock -= newProduct.quantity;
      await product.save();
    }));

    Object.keys(orderData).forEach(key => {
      if (key !== 'orders') {
        existingOrder[key] = orderData[key];
      }
    });

    existingOrder.orders = orderData.orders;
    existingOrder.totalPrice = orderData.orders.reduce((acc, order) => acc += order.sellPrice * order.quantity, 0);
    existingOrder.changed = true;

    if (orderData.gstPrice) {
      if (orderData.gst) {
        existingOrder.totalPrice += Number((orderData.gstPrice / orderData.gst).toFixed(0));
      } else {
        existingOrder.totalPrice += orderData.gstPrice;
      }
    }

    await existingOrder.save();
    sendMessageOrderController()

    res.json({
      status: true,
      data: existingOrder,
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
  const { id } = req.params;
  const { billed, billNumber, dispatched, lrSent } = req.query;

  try {
    const order = await OrderModel.findOne({ id });

    if (!order) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    if (billed !== undefined) {
      if (billed === 'false') {
        order.billed = false;
        order.dispatched = false;
        order.lrSent = false;
        order.billNumber = "";
      } else if (billNumber) {
        order.billed = billed === 'true';
        order.billNumber = billNumber;
      } else {
        return res.status(404).json({
          status: false,
          data: null,
          message: "Bill Number is required"
        });
      }
    }
    if (dispatched !== undefined) {
      if (order.dispatched === 'false') {
        order.dispatched = false;
        order.lrSent = false;
      } else if (order.billed) {
        order.dispatched = dispatched === 'true';
      } else {
        return res.status(404).json({
          status: false,
          data: null,
          message: "Order must be billed first"
        });
      }
    }
    if (lrSent !== undefined) {
      if (lrSent === 'false') {
        order.lrSent = false;
      } else if (order.billed && order.dispatched) {
        order.lrSent = lrSent === 'true';
      } else {
        return res.status(404).json({
          status: false,
          data: null,
          message: "Order must be billed and dispatched first"
        });
      }
    }

    let newStatus = "BILLING";

    if (order.billed) {
      newStatus = "DISPATCHING";
      if (order.dispatched) {
        newStatus = "LR PENDING";
        if (order.lrSent) {
          newStatus = "DONE";
        }
      }
    }

    order.status = newStatus;
    await order.save();
    sendMessageOrderController()

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

const updateOrderDetails = async (req, res) => {
  const { orderId } = req.params;
  const { status = false } = req.query

  try {
    const order = await OrderModel.findOne({ "orders.id": orderId });

    if (!order) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }
    const singleOrder = order.orders.find(item => item.id === orderId);
    if (singleOrder) {
      singleOrder.done = status;
      await order.save();
    }
    sendMessageOrderController()

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

const getAllOrders = async (req, res) => {


  if (req.query.confirmOrder === 'false') {
    confirmOrder = false;
  }

  try {
    const orders = await OrderModel.aggregate([
      {
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'userId', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'user'
        }
      },
      {
        $unwind: '$user' // Deconstructing the array field 'user' to individual documents
      },
      {
        $lookup: {
          from: 'parties',
          localField: 'partyId',
          foreignField: 'id',
          as: 'party'
        }
      },
      {
        $lookup: {
          from: 'transports',
          localField: 'transportId',
          foreignField: 'id',
          as: 'transport'
        }
      },
      {
        $unwind: '$transport' // Deconstructing the array field 'transport' to individual documents
      },
      {
        $unwind: '$party' // Deconstructing the array field 'party' to individual documents
      },
      {
        $unwind: '$orders' // Deconstructing the array field 'orders' to individual documents
      },
      {
        $lookup: {
          from: 'products', // Name of the collection you're joining with (products collection)
          localField: 'orders.productId', // Field from OrderModel
          foreignField: 'id', // Field from Product model
          as: 'product'
        }
      },
      {
        $unwind: '$product' // Deconstructing the array field 'product' to individual documents
      },
      {
        $group: {
          _id: '$_id',
          id: { $first: '$id' },
          party: { $first: '$party' },
          transportId: { $first: '$transport.id' },
          companyName: { $first: '$companyName' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          priority: { $first: '$priority' },
          lrSent: { $first: '$lrSent' },
          changed: { $first: '$changed' },
          status: { $first: '$status' },
          freight: { $first: '$freight' },
          gst: { $first: '$gst' },
          gstPrice: { $first: '$gstPrice' },
          totalPrice: { $first: '$totalPrice' },
          confirmOrder: { $first: '$confirmOrder' },
          narration: { $first: '$narration' },
          createdAt: { $first: '$createdAt' },
          user: { $first: { id: '$user.id', name: '$user.name', nickName: '$user.nickName' } },
          products: {
            $push: {
              id: '$product.id',
              productName: '$product.productName',
              productType: '$product.productType',
              quantity: '$orders.quantity',
              sellPrice: '$orders.sellPrice',
              done: '$orders.done'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({
      status: true,
      data: orders,
      message: "Order details retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};


// Get Order by ID
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await OrderModel.aggregate([
      {
        $match: {
          id
        }
      },
      {
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'userId', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'parties',
          localField: 'partyId',
          foreignField: 'id',
          as: 'party'
        }
      },
      {
        $lookup: {
          from: 'transports',
          localField: 'transportId',
          foreignField: 'id',
          as: 'transport'
        }
      },
      {
        $unwind: '$transport' // Deconstructing the array field 'transport' to individual documents
      },
      {
        $unwind: '$party' // Deconstructing the array field 'party' to individual documents
      },
      {
        $unwind: '$user' // Deconstructing the array field 'user' to individual documents
      },
      {
        $unwind: '$orders' // Deconstructing the array field 'orders' to individual documents
      },
      {
        $lookup: {
          from: 'products', // Name of the collection you're joining with (products collection)
          localField: 'orders.productId', // Field from OrderModel
          foreignField: 'id', // Field from Product model
          as: 'product'
        }
      },
      {
        $unwind: '$product' // Deconstructing the array field 'product' to individual documents
      },
      {
        $group: {
          _id: '$_id',
          id: { $first: '$id' },
          party: { $first: '$party' },
          transportId: { $first: '$transport.id' },
          companyName: { $first: '$companyName' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          lrSent: { $first: '$lrSent' },
          changed: { $first: '$changed' },
          status: { $first: '$status' },
          freight: { $first: '$freight' },
          gst: { $first: '$gst' },
          gstPrice: { $first: '$gstPrice' },
          totalPrice: { $first: '$totalPrice' },
          priority: { $first: '$priority' },
          confirmOrder: { $first: '$confirmOrder' },
          narration: { $first: '$narration' },
          createdAt: { $first: '$createdAt' },
          user: { $first: { id: '$user.id', name: '$user.name', nickName: '$user.nickName' } },
          products: {
            $push: {
              id: '$product.id',
              productName: '$product.productName',
              productType: '$product.productType',
              quantity: '$orders.quantity',
              sellPrice: '$orders.sellPrice',
              done: '$orders.done'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

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
    const order = await OrderModel.aggregate([
      {
        $match: {
          status
        }
      },
      {
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'userId', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'parties',
          localField: 'partyId',
          foreignField: 'id',
          as: 'party'
        }
      },
      {
        $lookup: {
          from: 'transports',
          localField: 'transportId',
          foreignField: 'id',
          as: 'transport'
        }
      },
      {
        $unwind: '$transport' // Deconstructing the array field 'transport' to individual documents
      },
      {
        $unwind: '$party' // Deconstructing the array field 'party' to individual documents
      },
      {
        $unwind: '$user' // Deconstructing the array field 'user' to individual documents
      },
      {
        $unwind: '$orders' // Deconstructing the array field 'orders' to individual documents
      },
      {
        $lookup: {
          from: 'products', // Name of the collection you're joining with (products collection)
          localField: 'orders.productId', // Field from OrderModel
          foreignField: 'id', // Field from Product model
          as: 'product'
        }
      },
      {
        $unwind: '$product' // Deconstructing the array field 'product' to individual documents
      },
      {
        $group: {
          _id: '$_id',
          id: { $first: '$id' },
          party: { $first: '$party' },
          transportId: { $first: '$transport.id' },
          companyName: { $first: '$companyName' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          lrSent: { $first: '$lrSent' },
          changed: { $first: '$changed' },
          status: { $first: '$status' },
          freight: { $first: '$freight' },
          gst: { $first: '$gst' },
          gstPrice: { $first: '$gstPrice' },
          totalPrice: { $first: '$totalPrice' },
          confirmOrder: { $first: '$confirmOrder' },
          narration: { $first: '$narration' },
          createdAt: { $first: '$createdAt' },
          user: { $first: { id: '$user.id', name: '$user.name', nickName: '$user.nickName' } },
          products: {
            $push: {
              id: '$product.id',
              productName: '$product.productName',
              productType: '$product.productType',
              quantity: '$orders.quantity',
              sellPrice: '$orders.sellPrice',
              done: '$orders.done'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({
      status: true,
      data: order,
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
  const { id } = req.params;
  try {
    const orderData = await OrderModel.findOne({ id });

    if (!orderData) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    await Promise.all(orderData.orders.map(async (order) => {
      const product = await Product.findOne({ id: order.productId });
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }
      product.stock += Number(order.quantity);
      await product.save();
    }));

    await OrderModel.deleteOne({ id });
    sendMessageOrderController()

    res.json({
      status: true,
      data: orderData,
      message: "Order deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

module.exports = { deleteOrder };


module.exports = {
  createOrder,
  updateOrder,
  getAllOrders,
  getOrderById,
  filterOrdersByStatus,
  deleteOrder,
  updateOrderStatus,
  updateOrderDetails
};
