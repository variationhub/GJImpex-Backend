const mongoose = require('mongoose');

const idTrakingModel = new mongoose.Schema({
    trakingId:{
        type: Number,
        default: 0
    }
},{versionKey: false});


module.exports = mongoose.model('idTrakingModel' , idTrakingModel);