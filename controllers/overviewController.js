const { OrderModel } = require("../models/orderModel");

const getProfit = async (req, res) => {

    const { from, to } = req.query
    const fromDate = new Date(from); // YYYY-MM-DD
    const toDate = new Date(to);

    let query = { status: 'DONE', }
    if (from && to) {
        query = { ...query, updatedAt: { $gte: fromDate, $lte: toDate } }
    }

    try {
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
                        $sum: { $multiply: ['$orders.quantity', '$orders.sellPrice'] } // Calculate total selling price
                    },
                    totalBuying: {
                        $sum: { $multiply: ['$orders.quantity', '$orders.buyPrice'] } // Calculate total buying price
                    },
                    orderDetails: {
                        $push: {
                            $mergeObjects: [
                                '$orders',
                                { gstPrice: '$gstPrice' },
                                { orderId: '$id' },
                                { createDate: '$updatedAt' },
                                { productName: '$product.productName' } // Include product name
                            ]
                        }
                    }
                }
            },
            {
                $sort: {
                    username: 1
                }
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
}


const getDailyReport = async (req, res) => {
    try {

        const { from, to } = req.query
        const fromDate = new Date(from); // YYYY-MM-DD
        const toDate = new Date(to);

        const dailyReport = await OrderModel.aggregate([
            {
                $match: {
                    status: "DONE",
                    updatedAt: { $gte: fromDate, $lte: toDate }
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
                    _id: "$partyId",
                    partyName: { $first: "$party.partyName" },
                    companyName: { $first: "$companyName" },
                    billNumber: { $first: "$billNumber" },
                    freight: { $first: "$freight" },
                    gst: { $first: "$gst" },
                    gstPrice: { $first: "$gstPrice" },
                    totalPrice: { $first: "$totalPrice" },
                    nickName: { $first: "$user.nickName" },
                    orders: {
                        $push: {
                            productName: "$product.productName",
                            quantity: "$orders.quantity",
                            sellPrice: "$orders.sellPrice",
                            createAt: "$updatedAt",

                        }
                    }
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
        const toDate = new Date(to);

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