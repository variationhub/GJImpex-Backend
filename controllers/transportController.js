const partyModel = require("../models/partyModel");
const Transport = require("../models/transportModel");
const { sendMessage } = require("../websocketHandler");
const { createNotification } = require("./notificationController");
const { sendMessagePartyController } = require("./partyController");

function sendMessageTransportController() {
  const message = {
    DOMAIN: 'TRANSPORT',
    INTENT: 'FETCHDATA'
  }
  sendMessage(message)
}

function internalServerError(res) {
  return res.status(200).json({
    status: false,
    data: null,
    message: "Internal server error"
  });
}

const createTransport = async (req, res) => {
  try {
    const body = req.body;

    const name = await Transport.findOne({ transportName: body.transportName });
    if (name) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Transport already exists"
      });
    }

    const transport = await Transport.create(body);

    createNotification(
      "Transport Created",
      `A new transport named "${body.transportName}" has been created.`
    );

    sendMessageTransportController();
    sendMessagePartyController();

    res.status(201).json({
      status: true,
      data: transport,
      message: "Transport created successfully"
    });

  } catch (error) {
    return internalServerError(res);
  }
};

const updateTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!updateData?.transportName) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Transport name not valid"
      });
    }

    const existingTransport = await Transport.findOne({ id });

    if (!existingTransport) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Transport not found"
      });
    }

    Object.keys(updateData).forEach(key => {
      existingTransport[key] = updateData[key];
    });

    await existingTransport.save();

    const updateResult = await partyModel.updateMany(
      { "transport.id": id },
      { $set: { "transport.$[elem].transportName": updateData.transportName } },
      { arrayFilters: [{ "elem.id": id }] }
    );


    createNotification(
      "Transport Updated",
      `Transport with name "${existingTransport.transportName}" has been updated.`
    );

    sendMessageTransportController();

    return res.status(200).json({
      status: true,
      data: existingTransport,
      message: "Transport updated successfully"
    });

  } catch (error) {
    return internalServerError(res);
  }
};


const getAllTransport = async (req, res) => {
  try {
    const data = await Transport.find({ isDeleted: false }, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ 'transportName': 1 });
    res.json({
      status: true,
      data: data,
      message: "Transports fetched successfully"
    });
  } catch (error) {
    return internalServerError(res)
  }
};

const getTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Transport.findOne({ id }, { _id: 0, createdAt: 0, updatedAt: 0 });
    if (!data) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Transport not found"
      });
    }

    return res.json({
      status: true,
      data: data,
      message: "Transports fetched successfully"
    });
  } catch (error) {
    return internalServerError(res)
  }
};

const deleteTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Transport.findOne({ id });
    if (!data) {
      return res.status(200).json({
        status: false,
        data: null,
        message: "Transport not found"
      });
    }

    const updateResult = await partyModel.updateMany(
      { "transport.id": id },
      { $set: { "transport.$.isDeleted": true } }
    );

    data.isDeleted = true;
    await data.save();
    createNotification(
      "Transport Deleted",
      `Transport with name "${data.transportName}" has been deleted.`
    );

    sendMessageTransportController();

    return res.json({
      status: true,
      data: data,
      message: "Transport deleted successfully"
    });
  } catch (error) {
    return internalServerError(res);
  }
};


module.exports = {
  createTransport,
  updateTransport,
  getAllTransport,
  getTransport,
  deleteTransport,
};
