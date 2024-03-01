const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const { orderEnum, companyNameEnum } = require('../contanst/data');

const productDetails = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    productId: {
        type: String,
        required: true,
        ref: 'Product'
    },
    quantity: {
        type: Number,
        required: true
    },
    sellPrice: {
        type: Number,
        required: true
    },
    done: {
        type: Boolean,
        default: false
    }
}, { versionKey: false })

const orderModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    partyId: {
        type: String,
        required: true,
        ref: 'Party'
    },
    orders: [productDetails],
    companyName: {
        type: String,
        enum: companyNameEnum,
        required: true,
        trim: true
    },
    billed: {
        type: Boolean,
        default: false
    },
    billNumber: {
        type: String,
        trim: true,
        default: ""
    },
    dispatched: {
        type: Boolean,
        default: false
    },
    lrSent: {
        type: Boolean,
        default: false
    },
    changed: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: orderEnum,
        default: "BILLING",
    },
    gst: {
        type: Number,
        default: 0
    },
    gstPrice: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    confirmOrder: {
        type: Boolean,
        default: true
    },
    narration: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false })

orderModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const OrderModel = mongoose.model('Order', orderModel)
const OrderDetailsModel = mongoose.model('OrderDetails', productDetails)

module.exports = { OrderModel, OrderDetailsModel }