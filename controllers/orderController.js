const { OrderModel } = require('../models/orderModel');
// const DeviceModel = require('../models/deviceModel');
const Product = require('../models/productModel');
const Party = require('../models/partyModel');
const { sendMessage } = require('../websocketHandler');
const scheduleNotification = require('../services/notificationServices');
const { createNotification } = require("./notificationController");
const { sendMessageProductController } = require('./productController');
const { default: mongoose } = require('mongoose');
const counterModel = require('../models/counterModel');

function sendMessageOrderController() {
  const message = {
    DOMAIN: 'ORDER',
    INTENT: 'FETCHDATA'
  }
  sendMessage(message)
}

async function generateOrderNumber() {
  const result = await counterModel.findOneAndUpdate(
    { key: 'orderNumber' },
    [
      {
        $set: {
          value: {
            $cond: [
              { $gte: ['$value', 9999] },
              1,
              { $add: ['$value', 1] }
            ]
          }
        }
      }
    ],
    {
      new: true
    }
  );

  if (!result) {
    const newCounter = await counterModel.create({ key: 'orderNumber', value: 1 });
    return newCounter.value;
  }

  return result.value;
}

const createOrder = async (req, res) => {

  try {
    const orderData = req.body;
    const createdBy = req.user?.id;
    const productData = await Product.find({ id: { $in: orderData.orders.map(item => item.productId) } });
    const { userId } = await Party.findOne({ id: orderData.partyId }, { userId: 1 });
    let orderNumber = null;

    await Promise.all(orderData.orders.map(async (order, index) => {

      const product = productData.find(item => item.id === order.productId);
      if ((product?.stock - Math.abs(product?.pendingOrderStock)) < order.quantity) {
        throw new Error(`${product.productName} have Only ${product?.stock - Math.abs(product?.pendingOrderStock)} stock.`);
      } else {

        let stock = order.quantity;
        let subTotalPrice = 0;
        const orderProductHistory = [];
        for (let i = 0; i < product.productPriceHistory.length; i++) {
          let item = orderData.confirmOrder ? product.productPriceHistory[i] : JSON.parse(JSON.stringify(product.productPriceHistory[i]));
          if (item.stock >= stock && stock !== 0) {
            subTotalPrice += stock * item.price;
            item.stock -= stock
            orderProductHistory.push({
              quantity: stock,
              buyPrice: item.price,
              userId: item.userId,
              id: item.id
            })
            stock = 0;
            break;
          } else if (item.stock) {
            stock -= item.stock;
            subTotalPrice += item.stock * item.price
            orderProductHistory.push({
              quantity: item.stock,
              buyPrice: item.price,
              userId: item.userId,
              id: item.id
            })
            item.stock = 0;
          }
        }

        orderData.orders[index] = {
          ...order,
          buyPrice: (subTotalPrice / order.quantity).toFixed(2),
          buyPriceHistory: orderProductHistory,

        }
        subTotalPrice = 0;

        if (!product) {
          throw new Error(`Product with ID ${order.productId} not found.`);
        }

        // let stockBelowMin = product.stock < product.minStock;

        if (orderData.confirmOrder) {
          product.stock -= order.quantity;
        } else {
          product.pendingOrderStock += order.quantity
        }

        // if (!stockBelowMin && product.stock < product.minStock) {
        //   const topic = "Stock Alert";
        //   const description = `${product.productName} stock is below the minimum stock level`;
        //   const devices = await DeviceModel.find({ userId });
        //   devices.forEach(device => {
        //     scheduleNotification(device?.deviceToken, topic, description, Date.now());
        //   });
        // }

      }
    }));

    if (orderData.confirmOrder) {
      orderNumber = await generateOrderNumber();
    }

    const newOrder = new OrderModel({ ...orderData, userId, createdBy, orderNumber });
    await newOrder.save();

    await Promise.all(productData.map(async (product) => {
      await product.save();
    }));

    createNotification(
      "Order Created",
      `An order has been created with order number ${orderNumber} by ${orderData.companyName}.`
    );
    sendMessageOrderController()
    sendMessageProductController()

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

const updateOrder = async (req, res) => {
  let orderReseting = false;
  try {
    const { id } = req.params;
    const orderData = req.body;
    // Start the transaction

    const existingOrder = await OrderModel.findOne({ id });
    if (!existingOrder) {
      throw new Error("Order not found");
    }

    if (existingOrder?.status !== "BILLING") {
      throw new Error("Cannot update an order to a status other than BILLING.");
    }

    if (existingOrder.confirmOrder) {
      await Promise.all(existingOrder.orders.map(async (orderOldData) => {
        const productData = await Product.findOne({ id: orderOldData.productId });
        if (productData) {
          productData.productPriceHistory.forEach(item => {
            if (orderOldData.buyPriceHistory.map(a => a.id).includes(item.id)) {
              const stock = orderOldData.buyPriceHistory.find(a => a.id === item.id)?.quantity || 0;
              item.stock = item.stock + stock;
              productData.stock = productData?.stock + stock;
            }
          });
          await productData.save();
        }
      }));
    } else {
      await Promise.all(existingOrder.orders.map(async (orderOldData) => {
        const productData = await Product.findOne({ id: orderOldData.productId });
        productData.pendingOrderStock -= orderOldData.quantity;
        await productData.save();
      }));
    }

    orderReseting = true

    const productData = await Product.find({ id: { $in: orderData.orders.map(item => item.productId) } })

    await Promise.all(orderData.orders.map(async (order, index) => {
      const product = productData.find(item => item.id === order.productId);
      if (!product) {
        throw new Error(`Product with ID ${order.productId} not found.`);
      }

      if ((product?.stock - Math.abs(product?.pendingOrderStock)) < order.quantity) {
        throw new Error(`${product.productName} have Only ${product?.stock - Math.abs(product.pendingOrderStock)} stock.`);
      }

      let stock = order.quantity;
      let subTotalPrice = 0;
      const orderProductHistory = [];

      // Process price history
      for (let i = 0; i < product.productPriceHistory.length; i++) {
        let item = orderData.confirmOrder ? product.productPriceHistory[i] : JSON.parse(JSON.stringify(product.productPriceHistory[i]));
        if (item.stock >= stock && stock !== 0) {
          subTotalPrice += stock * item.price;
          item.stock -= stock;
          orderProductHistory.push({
            quantity: stock,
            buyPrice: item.price,
            userId: item.userId,
            id: item.id
          });
          stock = 0;
          break;
        } else if (item.stock) {
          stock -= item.stock;
          subTotalPrice += item.stock * item.price;
          orderProductHistory.push({
            quantity: item.stock,
            buyPrice: item.price,
            userId: item.userId,
            id: item.id
          });
          item.stock = 0;
        }
      }

      orderData.orders[index] = {
        ...order,
        buyPrice: (subTotalPrice / order.quantity).toFixed(2),
        buyPriceHistory: orderProductHistory
      };

      subTotalPrice = 0;

      // Update stock and pending stock based on order confirmation
      if (orderData.confirmOrder) {
        product.stock -= order.quantity;
      } else {
        product.pendingOrderStock += order.quantity;
      }
    }));

    if (!existingOrder.orderNumber) {
      existingOrder.orderNumber = await generateOrderNumber();
    }

    // Update the order data and save the order
    Object.keys(orderData).forEach(key => {
      existingOrder[key] = orderData[key];
    });

    existingOrder.changed = true;
    await existingOrder.save(); // Save the updated order

    await Promise.all(productData.map(async (product) => {
      await product.save();
    }));

    sendMessageOrderController();
    sendMessageProductController();
    createNotification(
      "Order Updated",
      `An order has been updated with order number ${existingOrder.orderNumber} by ${existingOrder.companyName}.`
    );

    return res.json({
      status: true,
      data: existingOrder,
      message: "Order updated successfully"
    });

  } catch (error) {
    if (orderReseting) {
      const existingOrder = await OrderModel.findOne({ id: req?.params?.id });

      if (existingOrder?.confirmOrder) {
        await Promise.all(existingOrder?.orders.map(async (orderOldData) => {
          const productData = await Product.findOne({ id: orderOldData.productId });
          if (productData) {
            productData.productPriceHistory.forEach(item => {
              if (orderOldData.buyPriceHistory.map(a => a.id).includes(item.id)) {
                const stock = orderOldData.buyPriceHistory.find(a => a.id === item.id)?.quantity || 0;
                item.stock = item.stock - stock;
                productData.stock = productData?.stock - stock;
              }
            });
            await productData.save();
          }
        }));
      } else {
        await Promise.all(existingOrder.orders.map(async (orderOldData) => {
          const productData = await Product.findOne({ id: orderOldData.productId });
          productData.pendingOrderStock += orderOldData.quantity;
          await productData.save();
        }));
      }
    }
    res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};


const updateOrderStatus = async (req, res) => {
  const { id } = req.params;

  const {
    billed,
    billNumber,
    dispatched,
    dispatchBox,
    dispatchNarration,
    lrSent,
    reset
  } = req.body

  try {
    const order = await OrderModel.findOne({ id });

    if (!order) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    if (reset) {
      order.billed = false;
      order.dispatched = false;
      order.lrSent = false;
      order.billNumber = "";
      order.dispatchDate = null;
      order.dispatchBox = 0
      order.dispatchNarration = "";
      order.orderPast = false;

      order.status = "BILLING";
      await order.save();
      sendMessageOrderController();
      createNotification(
        "Order Status Reset",
        `An order has been reset with order number ${order.orderNumber}.`
      );
      return res.json({
        status: true,
        data: order,
        message: "Order reset successfully"
      });

    }

    if (billed && billNumber === "") {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Bill Number is required"
      });
    }
    order.billNumber = billNumber;
    order.billed = billed;
    order.dispatched = dispatched;
    order.dispatchDate = dispatched ? order?.dispatchDate || new Date() : null;
    order.dispatchBox = dispatchBox;
    order.dispatchNarration = dispatchNarration;
    order.lrSent = lrSent;
    order.orderPast = false;

    let newStatus = "BILLING";

    if (billed) {
      newStatus = "DISPATCHING";
      if (dispatched) {
        newStatus = "LR PENDING";
        if (lrSent) {
          newStatus = "DONE";
        }
      }
    }

    order.status = newStatus;

    await order.save();
    sendMessageOrderController();
    createNotification(
      "Order Status Updated",
      `An order has been updated to ${order.status} with order number ${order.orderNumber}.`
    );
    res.json({
      status: true,
      data: order,
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

const updateOrderDetails = async (req, res) => {
  const { orderId } = req.params;
  const checked = req.query.checked || "";
  const done = req.query.done || "";
  const productId = req.query.productId

  try {
    const order = await OrderModel.findOne({ id: orderId });

    if (!order) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }
    const singleOrder = order.orders.find(item => item.productId === productId);
    if (singleOrder) {
      if (checked === "") {
        singleOrder.checked = "";
        singleOrder.done = "";
      }
      else if (done != "") {
        singleOrder.done = done;
      }
      else if (checked != "") {
        singleOrder.checked = checked;
        singleOrder.done = "";
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
        $match: {
          status: { $ne: 'DONE' },
          isDeleted: { $ne: true },
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
        $addFields: {
          transportName: {
            $cond: [
              {
                $ifNull: ["$transportId", false]
              },
              {
                $arrayElemAt: ["$transport.transportName", 0]
              },
              "$customTransport"
            ]
          },
        }
      },
      {
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        }
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
          transportId: { $first: '$transportId' },
          destination: { $first: '$destination' },
          transportName: { $first: '$transportName' },
          eBilling: { $first: '$transport.eBilling' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast: { $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          dispatchBox: { $first: '$dispatchBox' },
          dispatchNarration: { $first: '$dispatchNarration' },
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
              checked: '$orders.checked',
              buyPrice: '$orders.buyPrice',
            }
          }
        }
      },
      {
        $sort: { orderNumber: -1 }
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

const getAllDeletedOrders = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;

    const orders = await OrderModel.aggregate([
      {
        $match: {
          isDeleted: true
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
        $addFields: {
          transportName: {
            $cond: [
              {
                $ifNull: ["$transportId", false]
              },
              {
                $arrayElemAt: ["$transport.transportName", 0]
              },
              "$customTransport"
            ]
          }
        }
      },
      {
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        }
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
          transportId: { $first: '$transportId' },
          destination: { $first: '$destination' },
          transportName: { $first: '$transportName' },
          eBilling: { $first: '$transport.eBilling' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast: { $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          dispatchBox: { $first: '$dispatchBox' },
          dispatchNarration: { $first: '$dispatchNarration' },
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
    ]).skip(skip)
      .limit(limit);

    const totalCount = await OrderModel.find({ isDeleted: true }).count();

    res.json({
      status: true,
      data: orders,
      meta_data: {
        page,
        items: totalCount,
        page_size: limit,
        pages: Math.ceil(totalCount / limit)
      },
      message: "Deleted orders retrieved successfully"
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
        $addFields: {
          transportName: {
            $cond: [
              {
                $ifNull: ["$transportId", false]
              },
              "$transport.transportName",
              "$customTransport"
            ]
          }
        }
      },
      {
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        }
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
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'orders.checked', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'checkedBy'
        }
      },
      {
        $unwind: {
          path: '$checkedBy', // Deconstructing the array field 'product' to individual documents
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $lookup: {
          from: 'users', // Name of the collection you're joining with (users collection)
          localField: 'orders.done', // Field from OrderModel
          foreignField: 'id', // Field from User model
          as: 'doneBy'
        }
      },
      {
        $unwind: {
          path: '$doneBy', // Deconstructing the array field 'product' to individual documents
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $group: {
          _id: '$_id',
          id: { $first: '$id' },
          party: { $first: '$party' },
          destination: { $first: '$destination' },
          transportId: { $first: '$transport.id' },
          transportName: { $first: '$transportName' },
          eBilling: { $first: '$transport.eBilling' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast: { $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          dispatchBox: { $first: '$dispatchBox' },
          dispatchNarration: { $first: '$dispatchNarration' },
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
              checked: '$orders.checked',
              checkedUserId: '$checkedBy.id',
              checkPriority: '$checkedBy.priority',
              done: '$orders.done',
              doneUserId: '$doneBy.id',
              donePriority: '$doneBy.priority',
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!order) {
      return res.status(200).json({
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
    const { page, limit, skip } = req.pagination;
    const { from, to } = req.query


    let query = { status, isDeleted: false }
    if (from && to && from !== 'null' && to !== 'null') {
      const fromDate = new Date(from); // YYYY-MM-DD
      const toDate = new Date(to); // YYYY-MM-DD
      toDate.setDate(toDate.getDate() + 1);
      query = { ...query, createdAt: { $gte: fromDate, $lte: toDate } }
    }

    const order = await OrderModel.aggregate([
      {
        $match: query
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
        $addFields: {
          transportName: {
            $cond: [
              {
                $ifNull: ["$transportId", false]
              },
              {
                $arrayElemAt: ["$transport.transportName", 0]
              },
              "$customTransport"
            ]
          }
        }
      },
      {
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        }
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
          transportId: { $first: '$transportId' },
          destination: { $first: '$destination' },
          transportName: { $first: '$transportName' },
          eBilling: { $first: '$transport.eBilling' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast: { $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
          billed: { $first: '$billed' },
          billNumber: { $first: '$billNumber' },
          dispatched: { $first: '$dispatched' },
          dispatchBox: { $first: '$dispatchBox' },
          dispatchNarration: { $first: '$dispatchNarration' },
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
    ]).skip(skip)
      .limit(limit);

    const totalCount = await OrderModel.find({
      ...query
    }).count();

    res.json({
      status: true,
      data: order,
      meta_data: {
        page,
        items: totalCount,
        page_size: limit,
        pages: Math.ceil(totalCount / limit)
      },
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
  try {
    const orderData = await OrderModel.findOne({ id });

    if (!orderData) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    if (orderData.status !== 'DONE' && orderData.status !== 'BILLING') {
      return res.status(200).json({
        status: false,
        data: null,
        message: `Cannot delete an order in ${orderData.status} status`
      });
    }

    if (orderData.status === "BILLING" && !orderData.isDeleted) {
      if (orderData?.confirmOrder) {
        await Promise.all(orderData.orders.map(async (orderOldData) => {
          const productData = await Product.findOne({ id: orderOldData.productId });
          productData.productPriceHistory.forEach(item => {
            if (orderOldData.buyPriceHistory.map(a => a.id).includes(item.id)) {
              const stock = orderOldData.buyPriceHistory.find(a => a.id === item.id)?.quantity || 0;
              item.stock = item.stock + stock;
              productData.stock = productData?.stock + stock;
            }
          });
          await productData.save();
          return;
        }));
      } else {
        await Promise.all(orderData.orders.map(async (orderOldData) => {
          const productData = await Product.findOne({ id: orderOldData.productId });
          productData.pendingOrderStock -= orderOldData.quantity
          await productData.save();
          return;
        }));
      }

      if (orderData.isDeleted) {
        await OrderModel.deleteOne({ id });
      } else {
        orderData.isDeleted = true; // Soft delete
        await orderData.save();
      }

      sendMessageOrderController()
      sendMessageProductController()

      return res.json({
        status: true,
        data: orderData,
        message: "Order deleted successfully"
      });
    }

    if (orderData.isDeleted) {
      await OrderModel.deleteOne({ id });
    } else {
      orderData.isDeleted = true; // Soft delete
      await orderData.save();
    }
    sendMessageOrderController();
    createNotification(
      "Order Deleted",
      `An order has been deleted with order number ${orderData.orderNumber} by ${orderData.companyName}.`
    );

    return res.json({
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

const getPendingOrderDetails = async (req, res) => {
  try {

    const { id } = req.params;
    const orderData = await OrderModel.aggregate([
      {
        $match: {
          confirmOrder: false,
          isDeleted: false
        }
      },
      {
        $unwind: "$orders"
      },
      {
        $match: {
          "orders.productId": id
        }
      },
      {
        $lookup: {
          from: "parties",
          localField: "partyId",
          foreignField: "id",
          as: "partyDetails"
        }
      },
      {
        $unwind: "$partyDetails"
      },
      {
        $project: {
          quantity: "$orders.quantity",
          partyName: "$partyDetails.partyName"
        }
      }
    ]);

    return res.json({
      status: true,
      data: orderData,
      message: "Pending order details fetched successfully"
    })


  } catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
}

module.exports = { deleteOrder };


module.exports = {
  createOrder,
  updateOrder,
  getAllOrders,
  getOrderById,
  filterOrdersByStatus,
  deleteOrder,
  updateOrderStatus,
  updateOrderDetails,
  getAllDeletedOrders,
  getPendingOrderDetails
};
