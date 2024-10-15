const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const transportModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid,
        index: true 
    },
    transportName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    mobileNumber: {
        type: String,
    },
    secondMobile:{
        type: String,
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
    nariation:{
        type: String,
        trim: true,
    },
    eBilling:{
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

transportModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Transport', transportModel);