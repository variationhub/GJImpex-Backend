const { OrderModel } = require("../models/orderModel");

const getProfit = async (req, res) => {
    try {
        const { from, to } = req.query;
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1);

        let query = { status: { $in: ["DONE", "LR PENDING"] } };
        if (from && to) {
            query = { ...query, dispatchDate: { $gte: fromDate, $lte: toDate } };
        }

        const overviewWithProfitMetrics = await OrderModel.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$orders'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orders.productId',
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $group: {
                    _id: '$userId',
                    username: { $first: '$user.name' },
                    nickname: { $first: '$user.nickName' },
                    mobileNumber: { $first: '$user.mobileNumber' },
                    totalSelling: {
                        $sum: { $multiply: ['$orders.quantity', '$orders.sellPrice'] }
                    },
                    totalBuying: {
                        $sum: { $multiply: ['$orders.quantity', '$orders.buyPrice'] }
                    },
                    orderDetails: {
                        $push: {
                            orderNumber: '$orderNumber',
                            dispatchDate: '$dispatchDate',
                            quantity: '$orders.quantity',
                            sellPrice: '$orders.sellPrice',
                            buyPrice: '$orders.buyPrice',
                            gstPrice: '$gstPrice',
                            orderId: '$id',
                            createDate: '$dispatchDate',
                            productName: '$product.productName'
                        }
                    }
                }
            },
            {
                $addFields: {
                    orderDetails: {
                        $sortArray: {
                            input: "$orderDetails",
                            sortBy: { dispatchDate: 1, orderNumber: 1, } // Sort orderDetails by orderNumber and dispatchDate
                        }
                    }
                }
            },
            {
                $sort: { username: 1 }
            }
        ]);

        return res.status(201).json({
            status: true,
            data: overviewWithProfitMetrics,
            message: "Overview"
        });

    } catch (error) {
        res.status(200).json({
            status: false,
            data: null,
            message: error.message
        });
    }
};


const getDailyReport = async (req, res) => {
    try {

        const { from, to } = req.query
        const fromDate = new Date(from); // YYYY-MM-DD
        const toDate = new Date(to); // YYYY-MM-DD
        toDate.setDate(toDate.getDate() + 1);

        const dailyReport = await OrderModel.aggregate([
            {
                $match: {
                    status: { $in: ["DONE", "LR PENDING"] },
                    dispatchDate: { $gte: fromDate, $lte: toDate },
                    isDeleted: { $ne: true }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $lookup: {
                    from: 'parties',
                    localField: 'partyId',
                    foreignField: 'id',
                    as: 'party'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$party'
            },
            {
                $unwind: '$orders'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orders.productId',
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $group: {
                    _id: { partyId: "$partyId", orderNumber: "$orderNumber" },
                    partyName: { $first: "$party.partyName" },
                    companyName: { $first: "$companyName" },
                    billNumber: { $first: "$billNumber" },
                    freight: { $first: "$freight" },
                    gst: { $first: "$gst" },
                    gstPrice: { $first: "$gstPrice" },
                    totalPrice: { $first: "$totalPrice" },
                    nickName: { $first: "$user.nickName" },
                    orderNumber: { $first: "$orderNumber" },
                    dispatchDate: { $first: "$dispatchDate" },
                    narration: { $first: "$narration"},
                    orders: {
                        $push: {
                            productName: "$product.productName",
                            quantity: "$orders.quantity",
                            sellPrice: "$orders.sellPrice",
                        }
                    }
                }
            },
            {
                $sort: {
                    orderNumber: 1,
                    dispatchDate: 1,
                }
            }
        ]);

        return res.status(201).json({
            status: true,
            data: dailyReport,
            message: "Overview"
        });

    } catch (error) {
        res.status(200).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

const deleteDoneOrder = async (req, res) => {
    try {
        const { from, to } = req.query
        const fromDate = new Date(from); // YYYY-MM-DD
        const toDate = new Date(to); // YYYY-MM-DD
        toDate.setDate(toDate.getDate() + 1);

        await OrderModel.deleteMany({ status: "DONE", updatedAt: { $gte: fromDate, $lte: toDate } });

        return res.status(201).json({
            status: true,
            data: [],
            message: "data deleted successfully"
        });

    } catch (error) {
        res.status(200).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}
module.exports = {
    getProfit,
    deleteDoneOrder,
    getDailyReport
}