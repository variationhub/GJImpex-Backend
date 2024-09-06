const { OrderModel } = require('../models/orderModel');
const DeviceModel = require('../models/deviceModel');
const Product = require('../models/productModel');
const Party = require('../models/partyModel');
const { sendMessage } = require('../websocketHandler');
const scheduleNotification = require('../services/notificationServices');
const { createNotification } = require("./notificationController");

function sendMessageOrderController() {
  const message = {
    DOMAIN: 'ORDER',
    INTENT: 'FETCHDATA'
  }
  sendMessage(message)
}

const createOrder = async (req, res) => {

  try {
    const orderData = req.body;
    const createdBy = req.user?.id;
    const productData = await Product.find({ id: { $in: orderData.orders.map(item => item.productId) } });
    const { userId } = await Party.findOne({ id: orderData.partyId }, { userId: 1 });
    let lastOrder = await OrderModel.findOne().sort({ createdAt: -1 });
    let orderNumber = ((lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber : 0) % 9999) + 1;

    await Promise.all(orderData.orders.map(async (order, index) => {

      const product = productData.find(item => item.id === order.productId);
      if (product.stock < order.quantity) {
        throw new Error(`${product.productName} have Only ${product.stock} stock.`);
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

        let stockBelowMin = product.stock < product.minStock;

        if (orderData.confirmOrder) {
          product.stock -= order.quantity;
        } else {
          product.pendingOrderStock += order.quantity
        }

        if (!stockBelowMin && product.stock < product.minStock) {
          const topic = "Stock Alert";
          const description = `${product.productName} stock is below the minimum stock level`;
          const devices = await DeviceModel.find({ userId });
          devices.forEach(device => {
            scheduleNotification(device?.deviceToken, topic, description, Date.now());
          });
        }

      }
    }));

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
  try {

    const { id } = req.params;
    const orderData = req.body;
    
    const existingOrder = await OrderModel.findOne({ id });
    
    if (!existingOrder) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Order not found"
      });
    }

    if(existingOrder?.status !== "BILLING"){
      return res.status(400).json({
        status: false,
        data: null,
        message: "Cannot update an order to a status other than BILLING."
      });
    }

    const productData = await Product.find({ id: { $in: [...orderData.orders.map(item => item.productId), ...existingOrder.orders.map(item => item.productId)] } });
    const newAddedProduct = orderData.orders.filter(item => !existingOrder.orders.map(i => i.productId).includes(item.productId));


    if (existingOrder.confirmOrder && !orderData.confirmOrder) {
      await Promise.all(existingOrder.orders.map(async (orderOldData) => {
        const productData = await Product.findOne({ id: orderOldData.productId });
        productData.productPriceHistory.forEach(item => {
          if (orderOldData.buyPriceHistory.map(a => a.id).includes(item.id)) {
            const stock = orderOldData.buyPriceHistory.find(a => a.id === item.id)?.quantity || 0;
            item.stock = item.stock + stock;
            productData.stock = productData?.stock + stock;
            productData.pendingOrderStock = productData?.pendingOrderStock + stock; //
          }
        });
        await productData.save();
        return;

      }));
    }
    else {
      const existingOrderStatus = existingOrder.confirmOrder;
      await Promise.all(existingOrder.orders.map(async (orderOldData) => {
        const orderNewData = orderData.orders.find(item => item.productId === orderOldData.productId);
        if (!orderNewData) {
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
        } else {

          if (orderNewData.quantity !== orderOldData.quantity) {

            const product = productData.find(item => item.id === orderOldData.productId);
            if (orderNewData.quantity < orderOldData.quantity) {
              let stockAdd = orderOldData.quantity - orderNewData.quantity;
              const remaining = stockAdd;
              for (let i = orderOldData.buyPriceHistory.length - 1; i >= 0; i--) {
                const order = orderOldData.buyPriceHistory[i];
                const data = product.productPriceHistory.find(item => item.id === order.id);
                const stockSpace = data.addedStock - data.stock
                if (stockAdd > 0) {
                  if (stockSpace >= stockAdd) {
                    data.stock += stockAdd;
                    order.quantity -= stockAdd;
                    stockAdd = 0;
                  } else {
                    data.stock += stockSpace;
                    stockAdd -= stockSpace;
                    order.quantity = 0;
                  }
                }
              }
              product.stock += remaining;
              orderOldData.buyPriceHistory = orderOldData.buyPriceHistory.filter(item => item.quantity)
              orderOldData.quantity = orderOldData.buyPriceHistory.reduce((acc, curr) => acc + curr.quantity, 0);
              orderOldData.buyPrice = (orderOldData.buyPriceHistory.reduce((acc, curr) => acc + curr.buyPrice * curr.quantity, 0) / orderOldData.quantity).toFixed(2)

            } else if (orderNewData.quantity > orderOldData.quantity) {

              let stock = orderNewData.quantity - orderOldData.quantity;
              if (product.stock < stock) {
                throw new Error(`${product.productName} have Only ${product.stock} stock.`);
              }

              let subTotalPrice = 0;
              const orderProductHistory = [...orderOldData.buyPriceHistory];
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
                  product.stock -= stock
                  stock = 0;
                  break;
                } else if (item.stock) {
                  product.stock -= stock
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

              orderOldData.buyPrice = Number(subTotalPrice / orderOldData.quantity).toFixed(2);
              orderOldData.quantity = orderProductHistory.reduce((acc, curr) => acc + curr.quantity, 0)
              orderOldData.buyPriceHistory = orderProductHistory
              subTotalPrice = 0;

              if (!product) {
                throw new Error(`Product with ID ${orderOldData.productId} not found.`);
              }

            }
          }

          if (orderNewData.sellPrice !== orderOldData.sellPrice) {
            changes = true;
            orderOldData.sellPrice = orderNewData.sellPrice;
          }
        }

      }));

      if (!existingOrderStatus && orderData.confirmOrder) {
        await Promise.all(orderData.orders.map(async (order, index) => {

          const product = productData.find(item => item.id === order.productId);
          if (product.stock < order.quantity) {
            throw new Error(`${product.productName} have Only ${product.stock} stock.`);
          } else {

            let stock = order.quantity;
            let subTotalPrice = 0;
            const orderProductHistory = [];
            console.log(stock);
            for (let i = 0; i < product.productPriceHistory.length; i++) {
              let item = product.productPriceHistory[i];
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
              buyPriceHistory: orderProductHistory
            }
            subTotalPrice = 0;

            if (!product) {
              throw new Error(`Product with ID ${order.productId} not found.`);
            }

            if (orderData.confirmOrder) {
              product.stock -= order.quantity;
              product.pendingOrderStock -= order.quantity
            }
          }
        }))
      };

      if (newAddedProduct.length) {
        newAddedProduct.forEach(async (order, index) => {
          const product = productData.find(item => item.id === order.productId);
          if (product.stock < order.quantity) {
            throw new Error(`${product.productName} have Only ${product.stock} stock.`);
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

            order.buyPrice = Number((subTotalPrice / order.quantity).toFixed(2))
            order.buyPriceHistory = orderProductHistory
            subTotalPrice = 0;
          }

          if (!product) {
            throw new Error(`Product with ID ${order.productId} not found.`);
          }

          if (orderData.confirmOrder) {
            product.stock -= order.quantity;
          } else {
            product.pendingOrderStock += order.quantity
          }
        });

        existingOrder.orders = [...existingOrder.orders, ...newAddedProduct];
      }
    }

    Object.keys(orderData).forEach(key => {
      if (key !== 'orders') {
        existingOrder[key] = orderData[key];
      }
    });

    existingOrder.orders = existingOrder.orders.filter(item => orderData.orders.map(item => item.productId).includes(item.productId))
    existingOrder.totalPrice = Number(orderData.totalPrice || 0);
    existingOrder.changed = true;
    await existingOrder.save()

    sendMessageOrderController();
    createNotification(
      "Order Updated",
      `An order has been updated with order number ${existingOrder.orderNumber} by ${existingOrder.companyName}.`
    );
    await Promise.all(productData.map(async (product) => {
      await product.save();
    }));

    res.json({
      status: true,
      data: { existingOrder, productData },
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
        order.dispatchDate = Date.now();
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

    sendMessageOrderController();
    createNotification(
      "Order Updated",
      `Updated status of order number ${order.orderNumber} is ${newStatus}.`
    );

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
  const checked = req.query.checked || "";
  const done = req.query.done || "";
  const productId = req.query.productId

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
          }
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
          transportName: { $first: '$transportName' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast:{ $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
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
          transportName: { $first: '$transportName' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast:{ $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
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
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        },
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
          transportId: { $first: '$transport.id' },
          transportName: { $first: '$transportName' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          orderPast:{ $first: '$orderPast' },
          isDeleted: { $first: '$isDeleted' },
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
    const { page, limit, skip } = req.pagination;

    const order = await OrderModel.aggregate([
      {
        $match: {
          status,
          isDeleted: false
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
        $unwind: {
          path: '$transport',
          preserveNullAndEmptyArrays: true
        },
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
          transportName: { $first: '$transportName' },
          companyName: { $first: '$companyName' },
          orderNumber: { $first: '$orderNumber' },
          isDeleted: { $first: '$isDeleted' },
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
    ]).skip(skip)
      .limit(limit);

    const totalCount = await OrderModel.find({ status }).count();

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

    if (orderData.status !== 'DONE' && orderData.status !== 'BILLING') {
      return res.status(200).json({
        status: false,
        data: null,
        message: `Cannot delete an order in ${orderData.status} status`
      });
    }

    if (orderData.status === "BILLING") {
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

      if (orderData.isDeleted) {
        await OrderModel.deleteOne({ id });
      } else {
        orderData.isDeleted = true; // Soft delete
        await orderData.save();
      }

      sendMessageOrderController()

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
  getAllDeletedOrders
};
