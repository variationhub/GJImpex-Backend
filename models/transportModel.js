const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const transportModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    transportName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
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

transportModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Transport', transportModel);