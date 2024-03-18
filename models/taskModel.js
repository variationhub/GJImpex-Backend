const { taskTypeEnum } = require('../contanst/data');


const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const taskModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    topic: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: taskTypeEnum,
        trim: true
    },
    assigner: {
        name: {
            type: String,
            trim: true,
            required: true
        },
        id: {
            type: String,
            trim: true,
            ref: 'User'
        }
    },
    assignTo: [{
        name: {
            type: String,
            trim: true,
            required: true
        },
        id: {
            type: String,
            trim: true,
            ref: 'User'
        }
    }],
    timeSent: {
        type: Date,
        default: Date.now
    },
    roomId: {
        type: Number,
        required: true,
        trim: true,
        unique: true
    },
    done: {
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

taskModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Task', taskModel);