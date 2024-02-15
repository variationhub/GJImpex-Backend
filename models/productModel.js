const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            required: [true, "Product name is required"],
            unique: [true, "Product name must be unique"],
            trim: true,
            minlength: [3, "Product name must be at least 3 characters"],
        },
        description: {
            type: String,
        },
        stock: {
            type: Number,
            default: 0
        },
        createDate: {
            type: Date,
            default: Date.now,
        },
        updateDate: {
            type: Date,
        },
    },
    {
        versionKey: false,
    }
);

productSchema.pre("save", function (next) {
    const currentDate = new Date();
    this.updatedDate = currentDate;
    if (!this.createdDate) {
        this.createdDate = currentDate;
    }
    next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
