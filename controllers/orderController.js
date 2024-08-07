const { OrderModel } = require('../models/orderModel');
const Product = require('../models/productModel');
const Party = require('../models/partyModel');
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
  const createdBy = req.user?.id;
  const productData = await Product.find({ id: { $in: orderData.orders.map(item => item.productId) } });
  const { userId } = await Party.findOne({ id: orderData.partyId }, { userId: 1 });

  try {

    await Promise.all(orderData.orders.map(async (order, index) => {

      const product = productData.find(item => item.id === order.productId);

      if (product.stock < order.quantity) {
        throw new Error(`${product.productName} have Only ${product.stock} stock.`);
      } else {

        let stock = order.quantity;
        let subTotalPrice = 0;
        product?.productPriceHistory?.forEach(item => {
          if (item.stock >= stock) {
            subTotalPrice += stock * item.price;
            item.stock -= stock
            stock = 0;
            return;
          } else if (item.stock) {
            stock -= item.stock;
            subTotalPrice += item.stock * item.price
            item.stock = 0;
          }
        })
        orderData.orders[index] = {
          ...order,
          buyPrice: subTotalPrice / order.quantity,
        }
        subTotalPrice = 0;

        if (!product) {
          throw new Error(`Product with ID ${order.productId} not found.`);
        }

        if (orderData.confirmOrder) {
          product.stock -= order.quantity;
        } else {
          product.pendingOrderStock += order.quantity
        }
      }
    }));


    const newOrder = new OrderModel({ ...orderData, userId, createdBy });

    await newOrder.save();


    // remove the stock 0

    await Promise.all(productData.map(async (product) => {
      // product.productPriceHistory = product.productPriceHistory.filter(item => item.stock);
      await product.save();
    }));

    sendMessageOrderController()
    res.json({
      status: true,
      data: newOrder,
      message: "Order created successfully"
    });
  } catch (error) {

    res.status(200).json({
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
  const userId = req.user.id;
  const existingOrder = await OrderModel.findOne({ id });
  const productData = await Product.find({ id: { $in: [...orderData.orders.map(item => item.productId), ...existingOrder.orders.map(item => item.productId)] } });

  const newAddedProduct = orderData.orders.filter(item => !existingOrder.orders.map(i => i.productId).includes(item.productId));

  try {

    if (!existingOrder) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    let changes = false;
    await Promise.all(existingOrder.orders.map(async (orderOldData) => {
      const orderNewData = orderData.orders.find(item => item.productId === orderOldData.productId);

      let tempCheck = false;
      if (!orderNewData) {
        changes = true;
        const productData = await Product.findOne({ id: orderOldData.productId });
        const stock = orderOldData.quantity;
        const price = orderOldData.buyPrice;
        productData.stock += stock;
        productData.productPriceHistory = [...productData.productPriceHistory, { stock, price, userId }]
        await productData.save();
        return;
      }

      if (orderNewData.quantity !== orderOldData.quantity) {
        // maintain the product quantity
        changes = true;
        tempCheck = true;
        const product = productData.find(item => item.id === orderOldData.productId);
        if (orderNewData.quantity < orderOldData.quantity) {
          const stock = orderOldData.quantity - orderNewData.quantity;
          const price = orderOldData.buyPrice;

          product.stock += stock;
          product.productPriceHistory = [...product.productPriceHistory, { stock, price, userId }]

          orderNewData.buyPrice = price
        } else {
          let stock = orderNewData.quantity - orderOldData.quantity;
          if (product.stock < stock) {
            throw new Error(`${product.productName} have Only ${product.stock} stock.`);
          }
          let subTotalPrice = 0;
          product?.productPriceHistory?.forEach(item => {
            if (item.stock >= stock) {
              subTotalPrice += stock * item.price;
              item.stock -= stock
              stock = 0;
              return;
            } else {
              stock -= item.stock;
              subTotalPrice += item.stock * item.price
              item.stock = 0;
            }

            product.pendingOrderStock += stock
          })

          orderNewData.buyPrice = ((subTotalPrice / (orderNewData.quantity - orderOldData.quantity)) + orderOldData.buyPrice) / 2,

            subTotalPrice = 0;

          if (!product) {
            throw new Error(`Product with ID ${order.productId} not found.`);
          }

          if (orderData.confirmOrder) {
            product.stock -= orderNewData.quantity - orderOldData.quantity;
          }

        }
      }

      if (orderNewData.sellPrice !== orderOldData.sellPrice) {
        // maintain the product price
        changes = true;
        orderOldData.sellPrice = orderNewData.sellPrice;
      }

      if (!tempCheck) {
        orderNewData.buyPrice = orderOldData.buyPrice
        if (existingOrder.confirmOrder == false && orderData.confirmOrder == true) {

          const productData = await Product.findOne({ id: orderNewData.productId });
          const quantity = orderNewData.quantity;
          productData.stock -= quantity;
          productData.pendingOrderStock -= quantity;
          await productData.save();

        }

        if (existingOrder.confirmOrder == true && orderData.confirmOrder == false) {

          const productData = await Product.findOne({ id: orderNewData.productId });
          const quantity = orderNewData.quantity;
          productData.stock += quantity;
          productData.pendingOrderStock += quantity;
          await productData.save();
        }
      }

    }));

    Object.keys(orderData).forEach(key => {
      if (key !== 'orders') {
        existingOrder[key] = orderData[key];
      }
    });

    if (newAddedProduct.length) {
      await Promise.all(newAddedProduct.map(async (order, index) => {

        const product = productData.find(item => item.id === order.productId);

        if (product.stock < order.quantity) {
          throw new Error(`${product.productName} have Only ${product.stock} stock.`);
        } else {

          let stock = order.quantity;
          let subTotalPrice = 0;
          product?.productPriceHistory?.forEach(item => {
            if (item.stock >= stock) {
              subTotalPrice += stock * item.price;
              item.stock -= stock
              stock = 0;
              return;
            } else {
              stock -= item.stock;
              subTotalPrice += item.stock * item.price
              item.stock = 0;
            }
          })
          order.buyPrice = subTotalPrice / order.quantity;

          if (changes) {
            orderData.orders.find(i => i.productId === order.productId).buyPrice = subTotalPrice / order.quantity;
          }

          subTotalPrice = 0;

          if (!product) {
            throw new Error(`Product with ID ${order.productId} not found.`);
          }
          console.log(existingOrder.confirmOrder, orderData.confirmOrder)
          if (existingOrder.confirmOrder == true && orderData.confirmOrder == true) {
            product.stock -= order.quantity;
          } else if (existingOrder.confirmOrder == true && orderData.confirmOrder == false) {
            product.stock -= order.quantity;
            product.pendingOrderStock += order.quantity;
          } else if (existingOrder.confirmOrder == false && orderData.confirmOrder == true) {
            product.stock -= order.quantity;
            product.pendingOrderStock -= order.quantity;
          } else if (existingOrder.confirmOrder == false && orderData.confirmOrder == false) {
            product.pendingOrderStock += order.quantity;
          }
        }
      }));

      existingOrder.orders = [...existingOrder.orders, ...newAddedProduct];


    }

    existingOrder.orders = changes ? orderData.orders : existingOrder.orders;
    existingOrder.totalPrice = Number(orderData.totalPrice || 0);
    existingOrder.changed = true;

    await existingOrder.save();
    sendMessageOrderController();

    await Promise.all(productData.map(async (product) => {
      // product.productPriceHistory = product.productPriceHistory.filter(item => item.stock);
      await product.save();
    }));

    res.json({
      status: true,
      data: existingOrder,
      message: "Order updated successfully"
    });

  } catch (error) {
    res.status(200).json({
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
    res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const updateOrderDetails = async (req, res) => {
  const { orderId } = req.params;
  const status = req.query.status || "";
  const productId = req.query.productId

  console.log(orderId, status, productId);
  try {
    const order = await OrderModel.findOne({ id: orderId });

    if (!order) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }
    const singleOrder = order.orders.find(item => item.productId === productId);
    if (singleOrder) {
      if (status === "false") {
        singleOrder.checked = false;
        singleOrder.done = false;
      }
      else if (status && singleOrder.checked) {
        singleOrder.done = status;
      }
      else if (status) {
        singleOrder.checked = status;
        singleOrder.done = false;
      }
      await order.save();
    }
    sendMessageOrderController()

    res.json({
      status: true,
      data: order,
      message: "Order status updated"
    });

  } catch (error) {
    res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const getAllOrders = async (req, res) => {

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
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'createdBy', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'createdBy'
        }
      },
      {
        $unwind: '$user' // Deconstructing the array field 'user' to individual documents
      },
      {
        $unwind: '$createdBy' // Deconstructing the array field 'user' to individual documents
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
          createdBy: { $first: { id: '$createdBy.id', name: '$createdBy.name', nickName: '$createdBy.nickName' } },
          createdAt: { $first: '$createdAt' },
          user: { $first: { id: '$user.id', name: '$user.name', nickName: '$user.nickName' } },
          products: {
            $push: {
              id: '$product.id',
              productName: '$product.productName',
              productType: '$product.productType',
              quantity: '$orders.quantity',
              sellPrice: '$orders.sellPrice',
              done: '$orders.done',
              checked: '$orders.checked'
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
    res.status(200).json({
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
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'createdBy', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'createdBy'
        }
      },
      {
        $unwind: '$user' // Deconstructing the array field 'user' to individual documents
      },
      {
        $unwind: '$createdBy' // Deconstructing the array field 'user' to individual documents
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
          createdBy: { $first: { id: '$createdBy.id', name: '$createdBy.name', nickName: '$createdBy.nickName' } },
          createdAt: { $first: '$createdAt' },
          user: { $first: { id: '$user.id', name: '$user.name', nickName: '$user.nickName' } },
          products: {
            $push: {
              id: '$product.id',
              productName: '$product.productName',
              productType: '$product.productType',
              quantity: '$orders.quantity',
              sellPrice: '$orders.sellPrice',
              done: '$orders.done',
              checked: '$orders.checked'
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
    res.status(200).json({
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
    res.status(200).json({
      status: false,
      data: null,
      message: 'Error fetching orders'
    });
  }
};

// Delete Order
const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const orderData = await OrderModel.findOne({ id });

    if (!orderData) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    if (orderData.status === "DONE") {
      await OrderModel.deleteOne({ id });
      sendMessageOrderController()

      return res.json({
        status: true,
        data: orderData,
        message: "Order deleted successfully"
      });
    }

    await Promise.all(orderData.orders.map(async (order) => {
      const product = await Product.findOne({ id: order.productId });
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }
      product.stock += Number(order.quantity);
      const newProductAdd = {
        stock: order.quantity,
        price: order.buyPrice,
        userId
      }
      product.productPriceHistory = [...product.productPriceHistory, newProductAdd]
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
    res.status(200).json({
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
