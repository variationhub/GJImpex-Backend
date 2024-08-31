const cron = require('node-cron');
const { OrderModel } = require('../models/orderModel');

let start = async function() {
    cron.schedule('0 0 * * *', async () => {
        try {
            updateOrderStatusToPast();
        } catch (error) {
            console.error('Error in cron job:', error);
        }
    });
}

let updateOrderStatusToPast = async function () {
    console.log("cron is running at", new Date());
    
    await OrderModel.updateMany({status: "LR PENDING"}, {status: "PAST"})
}

module.exports = {
    start
}