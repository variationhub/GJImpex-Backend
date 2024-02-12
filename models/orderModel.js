const mongoose = require("mongoose");

const orderProductSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
    },
    sellPrice: {
        type: Number,
        required: [true, 'Sell price is required'],
    },
});

const orderSchema = new mongoose.Schema(
    {
        partyName: {
            type: String,
            trim: true,
            validate: {
                validator: (value) => /^[a-zA-Z]+\s[a-zA-Z]+$/.test(value),
                message: 'Name must contain one space between party name and city.',
            },
        },
        transport: {
            type: String,
            trim: true
        },
        orders: [orderProductSchema],
        LR: {
            type: Boolean,
            default: false,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Reference to the User model
            required: [true, "User ID is required"],
        },
        status: {
            type: String,
            enum: ["pending", "dispatching and billing", "LR pending", "done"],
            default: "pending",
        },
        dispatched: {
            type: Boolean,
            default: false,
        },
        billed: {
            type: Boolean,
            default: false,
        },
        orderChanged: {
            type: Boolean,
            default: false,
        },
        totalPrice:{
            type: Number,
            default: 0
        },
        gstPrice:{
            type: Number,
            default: 0
        },
        createdDate: {
            type: Date,
            default: Date.now,
        },
        updatedDate: {
            type: Date,
        },
    },
    {
        versionKey: false,
    }
);

orderSchema.pre("save", function (next) {
    const currentDate = new Date();
    this.updatedDate = currentDate;
    if (!this.createdDate) {
        this.createdDate = currentDate;
    }
    next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
