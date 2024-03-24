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
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: (value) => /^[0-9]{10}$/.test(value),
            message: 'Mobile number must be 10 digits.'
        }
    },
    gst: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
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