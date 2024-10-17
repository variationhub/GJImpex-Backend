const cron = require('node-cron');
const { OrderModel } = require('../models/orderModel');
const notificationModel = require('../models/notificationModel');

let start = async function () {
    cron.schedule('0 0 * * *', async () => {
        try {
            updateOrderStatusToPast();
            deleteNotifications();
        } catch (error) {
            console.error('Error in cron job:', error);
        }
    }, {
        timezone: "Asia/Kolkata"  // Set timezone to IST
    });
}

let updateOrderStatusToPast = async function () {
    try {
        console.log("cron is running at", new Date());

        await OrderModel.updateMany({ status: "LR PENDING" }, { orderPast: true })
    } catch (error) {
        console.error("Error updating order status to past", error);
    }
}

let deleteNotifications = async function () {
    try {
        const sevenDays = new Date();
        sevenDays.setDate(sevenDays.getDate() - 7);

        await notificationModel.deleteMany({ createdAt: { $lte: sevenDays } })
    } catch (error) {
        console.error("Error deleting notifications", error);
    }
}

module.exports = {
    start
}