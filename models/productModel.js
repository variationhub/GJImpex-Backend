const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const productPriceHistory = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    addedStock: {
        type: Number,
        required: true,
        default: 0
    },
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false })

const productModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid,
        index: true 
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    productType: {
        type: String,
        trim: true,
    },
    minStock: {
        type: Number,
        required: true,
        default: 0
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    pendingOrderStock:{
        type: Number,
        default: 0
    },
    productPriceHistory: [productPriceHistory],
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
}, { versionKey: false });

productModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Product', productModel);