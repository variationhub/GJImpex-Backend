const Notification = require("../models/notificationModel");

const getAllNotification = async (req, res) => {
    try {
        const notifications = await Notification.find({}).sort({createdAt: -1});
        res.json({
            status: true,
            data: notifications,
            message: "Notifications fetched successfully"
        });
    } catch (error) {
        res.status(200).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

const createNotification = async (title = "", body = "") => {
    try {
        const notification = new Notification({
            title,
            body,
        });
        await notification.save();
    } catch (error) {
        console.error('Error saving notification:', error);
    }
};


module.exports = {
    getAllNotification,
    createNotification
}