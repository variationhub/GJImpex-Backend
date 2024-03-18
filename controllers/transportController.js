const Transport = require("../models/transportModel");


function internalServerError(res) {
  return res.status(500).json({
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
      return res.status(400).json({
        status: false,
        data: null,
        message: "Transport already exists"
      });
    }

    const transport = await Transport.create(body);
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
      return res.status(404).json({
        status: false,
        data: null,
        message: "Transport name not valid"
      });
    }

    const existingTransport = await Transport.findOne({ id });

    if (!existingTransport) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Transport not found"
      });
    }

    Object.keys(updateData).forEach(key => {
      existingTransport[key] = updateData[key];
    });

    await existingTransport.save();

    return res.status(200).json({
      status: true,
      data: existingTransport,
      message: "Transport updated successfully"
    });

  } catch (error) {
    return internalServerError(res)
  }
};



const getAllTransport = async (req, res) => {
  try {
    const data = await Transport.find({}, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ 'transportName': 1 });
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
      return res.status(404).json({
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
    const data = await Transport.findOneAndDelete({ id });
    if (!data) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "Transport not found"
      });
    }

    return res.json({
      status: true,
      data: data,
      message: "Transport deleted successfully"
    });
  } catch (error) {
    return internalServerError(res)
  }
};

module.exports = {
  createTransport,
  updateTransport,
  getAllTransport,
  getTransport,
  deleteTransport,
};
