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
    buyPrice: {
        type: Number,
        required: true
    },
    buyPriceHistory: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    done: {
        type: String,
        default: ""
    },
    checked: {
        type: String,
        default: ""
    },
    dispatcherId:{
        type: String,
        ref: 'User'
    }
}, { versionKey: false })

const orderModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid,
        index: true 
    },
    partyId: {
        type: String,
        required: true,
        ref: 'Party',
        index: true 
    },
    transportId: {
        type: String,
        ref: 'Transport',
        index: true 
    },
    customTransport: {
        type: String,
        trim: true,
        default: null
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
    freight: {
        type: Number,
        default: 0
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
    createdBy:{
        type: String,
        required: true,
        ref: 'User'
    },
    confirmOrder: {
        type: Boolean,
        default: true
    },
    priority:{
        type:String,
        trim:true,
        default:"None"
    },
    narration: {
        type: String,
    },
    dispatchDate: {
        type: Date,
        default: Date.now
    },
    orderNumber:{
        type: Number,
        default: ""
    },
    orderPast:{
        type: Boolean,
        default: false
    },
    isDeleted:{
        type: Boolean,
        default: false
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

module.exports = { OrderModel }