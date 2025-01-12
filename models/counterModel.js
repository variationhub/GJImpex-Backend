const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., "orderNumber"
    value: { type: Number, required: true }, // Current sequence value
});

module.exports = mongoose.model('Counter', counterSchema);
