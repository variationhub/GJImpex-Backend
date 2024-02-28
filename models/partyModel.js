const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const partyModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    partyName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    mobileNumber: {
        type: String,
        unique: true,
        trim: true,
        validate: {
            validator: (value) => /^[0-9]{10}$/.test(value),
            message: 'Mobile number must be 10 digits.'
        }
    },
    transportIds: [{
        type: String,
        required: true,
        ref: 'Transport'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false });

partyModel.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Party', partyModel);