const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const productModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
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
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    minStock: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true,
        default: 0
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