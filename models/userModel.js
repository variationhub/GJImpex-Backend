const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const bcrypt = require('bcrypt');
const { userEnum } = require('../contanst/data');

const userModel = new mongoose.Schema({
    id: {
        type: String,
        default: uuid
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    nickName: {
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
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: userEnum,
        default: 'Other'
    },
    dispatcheerPriority: {
        type: Number,
        default: 0,
    },
    dispatcherColor:{
        type: String,
        default: '#000000'
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isLoginAble: {
        type: Boolean,
        default: true
    },
    priority:{
        type:String,
        trim:true,
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

userModel.pre('save', async function (next) {
    this.updatedAt = new Date();
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', userModel);
