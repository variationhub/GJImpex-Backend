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
    const userId = req.user.id;

    const productFind = await Product.findOne({
      $and: [
        { productName: productData.productName },
        { productType: productData.productType }
      ]
    })

    if (productFind) {
      return res.status(400).json({
        status: false,
        data: null,
        message: "Product already exists"
      });
    }

    const stock = req.body.productPriceHistory.reduce((acc, curr) => {
      return acc + curr.stock;
    }, 0)

    const product = await Product.create({ ...productData, productPriceHistory: req.body.productPriceHistory.map(value => ({ ...value, userId })), stock });
    sendMessageProductController()
    res.status(201).json({
      status: true,
      data: product,
      message: "Product created successfully"
    });
  } catch (error) {
    res.status(200).json({
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
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const updateProductStock = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body.productPriceHistory;
  const userId = req.user.id

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
    product.productPriceHistory = [...product.productPriceHistory, ...updateData.map(value => ({ ...value, userId }))]
    await product.save();
    sendMessageProductController()
    return res.json({
      status: true,
      data: product,
      message: "Product stock updated successfully"
    });
  }
  catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
}

const getAllProducts = async (req, res) => {
  try {
    // const products = await Product.find({}, { "_id": 0, "updatedAt": 0, "createdAt": 0 });

    const productsData = await Product.aggregate([
      {
        $addFields: {
          productPriceHistory: {
            $ifNull: [
              "$productPriceHistory",
              []
            ]
          }
        }
      },
      {
        $unwind: {
          path: "$productPriceHistory",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "productPriceHistory.userId",
          foreignField: "id",
          as: "user"
        }
      },
      {
        $addFields: {
          "productPriceHistory.nickName": { $arrayElemAt: ["$user.nickName", 0] }
        }
      },
      {
        $group: {
          _id: "$_id",
          id: { $first: "$id" },
          productName: { $first: "$productName" },
          productType: { $first: "$productType" },
          minStock: { $first: "$minStock" },
          stock: { $first: "$stock" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          pendingOrderStock: { $first: "$pendingOrderStock" },
          productPriceHistory: { $push: "$productPriceHistory" }
        }
      },
      {
        $addFields: {
          productPriceHistory: {
            $filter: {
              input: "$productPriceHistory",
              as: "history",
              cond: { $ne: ["$$history", {}] }
            }
          }
        }
      },
      {
        $sort: {
          productName: 1
        }
      }
    ]);

    res.json({
      status: true,
      data: productsData,
      message: "Products fetch successfully"
    });
  } catch (error) {
    res.status(200).json({
      status: false,
      data: null,
      message: 'Error updating product'
    });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const productsData = await Product.aggregate([
      {
        $match: {
          id
        }
      },
      {
        $addFields: {
          productPriceHistory: {
            $ifNull: [
              "$productPriceHistory",
              []
            ]
          }
        }
      },
      {
        $unwind: {
          path: "$productPriceHistory",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "productPriceHistory.userId",
          foreignField: "id",
          as: "user"
        }
      },
      {
        $addFields: {
          "productPriceHistory.nickName": { $arrayElemAt: ["$user.nickName", 0] }
        }
      },
      {
        $group: {
          _id: "$_id",
          id: { $first: "$id" },
          productName: { $first: "$productName" },
          productType: { $first: "$productType" },
          minStock: { $first: "$minStock" },
          stock: { $first: "$stock" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          pendingOrderStock: { $first: "$pendingOrderStock" },
          productPriceHistory: { $push: "$productPriceHistory" }
        }
      },
      {
        $addFields: {
          productPriceHistory: {
            $filter: {
              input: "$productPriceHistory",
              as: "history",
              cond: { $ne: ["$$history", {}] }
            }
          }
        }
      },
      {
        $sort: {
          productName: 1
        }
      }
    ]);
    if (productsData.length === 0) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }
    res.json({
      status: true,
      data: productsData[0],
      message: "Product found successfully"
    });
  } catch (error) {
    res.status(200).json({
      status: false,
      data: null,
      message: 'Error fetching product'
    });
  }
};

const updateProductUpdate = async (req, res) => {
  const { id } = req.params;
  const { stockId, stock, price } = req.body;

  try {
    const product = await Product.findOne({ id });

    const data = product?.productPriceHistory?.find(value => value.id === stockId)

    product.stock = product.stock - data.stock

    data.stock = stock
    data.price = price

    product.stock += stock

    await product.save();
    sendMessageProductController()
    return res.json({
      status: true,
      data: product,
      message: "Product stock updated successfully"
    });
  }
  catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
}

const deleteProductStock = async (req, res) => {
  const { id , stockId} = req.params;

  try {
    const product = await Product.findOne({ id });

    const data = product?.productPriceHistory?.find(value => value.id === stockId)
    const products = product?.productPriceHistory?.filter(value => value.id !== stockId)

    product.stock = product.stock - data.stock
    product.productPriceHistory = products

    await product.save();
    sendMessageProductController()
    return res.json({
      status: true,
      data: product,
      message: "Product stock delete successfully"
    });
  }
  catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
}
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
    res.status(200).json({
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
  updateProductUpdate,
  deleteProductStock,
  deleteProduct,
};
