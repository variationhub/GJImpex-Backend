const Notification = require("../models/notificationModel");

const getAllNotification = async (req, res) => {
    try {
        const { page, limit, skip } = req.pagination;
        const notifications = await Notification.find({}).sort({createdAt: -1}).skip(skip).limit(limit);
        const totalCount = await Notification.find({}).count();
        
        res.json({
            status: true,
            data: notifications,
            meta_data: {
                page,
                items: totalCount,
                page_size: limit,
                pages: Math.ceil(totalCount / limit)
              },
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