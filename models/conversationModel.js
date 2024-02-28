const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const conversationModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    roomId: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    sender: {
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
}, { versionKey: false });

module.exports = mongoose.model('Conversation', conversationModel);