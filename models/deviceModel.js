const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    deviceToken: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('deviceToken', DeviceSchema);