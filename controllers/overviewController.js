const { OrderModel } = require("../models/orderModel");

const getProfit = async (req, res) => {
    try {

        const overviewWithProfitMetrics = await OrderModel.aggregate([
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
                $group: {
                    _id: '$userId',
                    username: { $first: '$user.name' },
                    nickname: { $first: '$user.nickName' },
                    totalSelling: {
                        $sum: { $multiply: ['$orders.quantity', '$orders.sellPrice'] } // Calculate total selling price
                    },
                    totalBuying: {
                        $sum: { $multiply: ['$orders.quantity', '$orders.buyPrice'] } // Calculate total buying price
                    }
                }
            }
        ]);

        return res.status(201).json({
            status: true,
            data: overviewWithProfitMetrics,
            message: "Overview"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

module.exports = {
    getProfit
}