const Conversation = require("../models/conversationModel");

const createConversation = async (req, res) => {
    try {
        const { id } = req.user;
        const body = req.body;

        const conversation = await Conversation.create({
            sender: id,
            ...body,
        });

        res.status(201).json({
            status: true,
            data: conversation,
            message: "Conversation created successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

const getAllConversation = async (req, res) => {
    try {
        const { roomId } = req.params

        const conversation = await Conversation.aggregate([
            {
                $match: {
                    roomId
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender',
                    foreignField: 'id',
                    as: 'senderDetails'
                }
            },
            {
                $unwind: '$senderDetails'
            },
            {
                $project: {
                    _id: 0,
                    roomId: 1,
                    message: 1,
                    sender: '$senderDetails.name', // Assuming user's name is stored in 'name' field
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);
        res.json({
            status: true,
            data: conversation,
            message: "Conversation fetched successfully"
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
    createConversation,
    getAllConversation,
}