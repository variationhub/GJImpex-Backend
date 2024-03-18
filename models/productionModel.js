const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const productionModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    productionName: {
        type: String,
        required: true,
        trim: true,
    },
    type: [{
        type: String,
        trim: true
    }],
    stock: {
        type: Number,
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
}, { versionKey: false })

productionModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Production', productionModel);