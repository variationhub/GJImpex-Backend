const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const notificationModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
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

module.exports = mongoose.model('Notification', notificationModel);