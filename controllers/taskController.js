const Task = require('../models/taskModel');
const IdTraking = require('../models/idTrakingModel');

const createTask = async (req, res) => {
    try {
        const body = req.body;
        const { id, name } = req.user;

        let idTracking = await IdTraking.findOne();
        if (!idTracking) {
            idTracking = await IdTraking.create({ trakingId: 0 });
        }

        idTracking.trakingId += 1;
        await idTracking.save();

        const task = await Task.create({ ...body, roomId: idTracking.trakingId, assigner: { id, name } });

        res.status(201).json({
            status: true,
            data: task,
            message: "Task created successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
};

const updateTask = async (req, res) => {
    try {
        const body = req.body;
        const { id } = req.params;

        const existingTask = await Task.findOne({ id });

        if (!existingTask) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Task not found"
            });
        }

        Object.keys(body).forEach(key => {
            existingTask[key] = body[key];
        });

        await existingTask.save();
        return res.json({
            status: true,
            data: existingTask,
            message: "Task updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: error.message
        });
    }
};

const getAllTask = async (req, res) => {
    try {
        const transports = await Task.find({}, { "_id": 0}).sort({ "createdAt": -1 });
        res.json({
            status: true,
            data: transports,
            message: "Task fetch successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: 'Error fetching transports'
        });
    }
};

const getTask = async (req, res) => {
    try {
        const { id } = req.params;
        const transport = await Task.findOne({ id }, { "_id": 0, "createdAt": 0, "updatedAt": 0 });
        if (!transport) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Task not found"
            });
        }
        res.json({
            status: true,
            data: transport,
            message: "Task fetched successfully"
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: 'Error fetching transport'
        });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTask = await Task.findOneAndDelete(id);
        if (!deletedTask) {
            return res.status(404).json({
                status: false,
                data: null,
                message: "Task not found"
            });
        }
        res.json({
            status: true,
            data: deletedTask,
            message: "Task deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: 'Error deleting transport'
        });
    }
};

module.exports = {
    createTask,
    updateTask,
    getAllTask,
    getTask,
    deleteTask
}