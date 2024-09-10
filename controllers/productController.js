const Product = require('../models/productModel');
const { sendMessage } = require('../websocketHandler');
const { createNotification } = require("./notificationController");

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
      return res.status(200).json({
        status: false,
        data: null,
        message: "Product already exists"
      });
    }

    let flag = false;
    const stock = req.body.productPriceHistory.reduce((acc, curr) => {
      curr.addedStock = curr.stock;
      if(curr.stock === 0 || curr.price === 0){
        flag = true;
      }
      return acc + curr.stock;
    }, 0)

    if(flag) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Stock or Price should not be zero"
      });
    }

    const product = await Product.create({ ...productData, productPriceHistory: req.body.productPriceHistory.map(value => ({ ...value, userId })), stock });
    
    createNotification(
      "Product Created",
      `Product has been created with product name ${productData.productName}.`
    );

    sendMessageProductController();
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
      return res.status(200).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }

    Object.keys(updateData).forEach(key => {
      product[key] = updateData[key];
    });

    await product.save();

    createNotification(
      "Product Updated",
      `Product has been updated with product name ${product.productName}.`
    );

    sendMessageProductController();
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

    if (!product) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }

    let flag = false;
    const stock = updateData.reduce((acc, curr) => {
      curr.addedStock = curr.stock
      if (curr.stock === 0 || curr.price === 0) {
        flag = true;
      }
      return acc + curr.stock;
    }, product.stock)

    if (flag) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Product stock cannot be zero or price cannot be zero"
      });
    }

    product.stock = stock;
    product.addedStock = stock.stock;
    product.productPriceHistory = [...product.productPriceHistory, ...updateData.map(value => ({ ...value, userId }))]
    await product.save();

    createNotification(
      "Product Stock Updated",
      `Product stock has been updated for product name ${product.productName}.`
    );

    sendMessageProductController();
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
      return res.status(200).json({
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

    if (stock === 0 || price === 0) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Stock or price must be greater than 0"
      });
    }

    const product = await Product.findOne({ id });

    const data = product?.productPriceHistory?.find(value => value.id === stockId);

    product.stock -= data.stock;

    data.stock = stock;
    data.addedStock = stock;
    data.price = price;

    product.stock += stock;

    await product.save();

    createNotification(
      "Product Stock Updated",
      `Product stock has been updated for product name ${product.productName}.`
    );

    sendMessageProductController();
    return res.json({
      status: true,
      data: product,
      message: "Product stock updated successfully"
    });
  } catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const deleteProductStock = async (req, res) => {
  const { id, stockId } = req.params;

  try {
    const product = await Product.findOne({ id });

    const data = product?.productPriceHistory?.find(value => value.id === stockId);
    const products = product?.productPriceHistory?.filter(value => value.id !== stockId);

    product.stock = product.stock - data.stock
    product.productPriceHistory = products

    await product.save();

    createNotification(
      "Product Stock Deleted",
      `Product stock has been deleted for product name ${product.productName}.`
    );

    sendMessageProductController();
    return res.json({
      status: true,
      data: product,
      message: "Product stock deleted successfully"
    });
  } catch (error) {
    return res.status(200).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findOneAndDelete({ id });

    if (!deletedProduct) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Product not found"
      });
    }

    createNotification(
      "Product Deleted",
      `Product with name ${deletedProduct.productName} has been deleted.`
    );

    sendMessageProductController();
    res.json({
      status: true,
      data: deletedProduct,
      message: "Product deleted successfully"
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
  sendMessageProductController
};
