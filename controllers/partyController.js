const Party = require('../models/partyModel');
const { sendMessage } = require('../websocketHandler');

function sendMessagePartyController() {
    const message = {
      DOMAIN: 'PARTY',
      INTENT: 'FETCHDATA'
    }
    sendMessage(message)
  }

const createParty = async (req, res) => {
    try {
        const body = req.body;

        const mobileNumber = await Party.findOne({ mobileNumber: body.mobileNumber });
        if (mobileNumber) {
            return res.status(400).json({
                status: false,
                data: null,
                message: "Party already exists"
            });
        }
        const party = await Party.create({ ...body });
        sendMessagePartyController()
        return res.status(201).json({
            status: true,
            data: party,
            message: "Party created successfully"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

const updateParty = async (req, res) => {
    try {
        const body = req.body;
        const { id } = req.params;
        const existingParty = await Party.findOne({ id });

        if (!existingParty) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Party not found"
            });
        }

        if (body.mobileNumber) {
            const mobileNumber = await Party.find({});
            const data = mobileNumber.find(value => (value.mobileNumber === body.mobileNumber && value.id !== existingParty.id));
            console.log(data);
            if (data) {
                return res.status(400).json({
                    status: false,
                    data: null,
                    message: "Party already exists"
                });
            }
        }

        Object.keys(body).forEach(key => {
            existingParty[key] = body[key];
        });

        await existingParty.save();
        sendMessagePartyController()
        return res.json({
            status: true,
            data: existingParty,
            message: "Party updated successfully"
        });


    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });

    }
}

const getAllParty = async (req, res) => {
    try {
        const data = await Party.find({}, { "_id": 0, "createdAt": 0, "updatedAt": 0 }).sort({ "partyName": 1 });
        return res.json({
            status: true,
            data: data,
            message: "Parties fetched successfully"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
}

const getParty = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Party.findOne({ id }, { "_id": 0, "createdAt": 0, "updatedAt": 0 });
        if (!data) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Party not found"
            });
        }
        return res.json({
            status: true,
            data: data,
            message: "Party found successfully"
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            data: null,
            message: error.message
        })
    }
}

const deleteParty = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Party.findOneAndDelete({ id });
        if (!data) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Party not found"
            });
        }
        sendMessagePartyController()
        return res.json({
            status: true,
            data: data,
            message: "Party deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        })
    }
}


module.exports = {
    createParty,
    updateParty,
    getAllParty,
    getParty,
    deleteParty
}