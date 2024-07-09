const Task = require('../models/taskModel');
const DeviceModel = require('../models/deviceModel');
const IdTracking = require('../models/idTrakingModel');
const { taskTypeEnum } = require('../contanst/data');
const scheduleNotification = require('../services/notificationServices');

const createTask = async (req, res) => {
    const userId = req.user.id

    const { topic, description, type, assignTo, timeSent = Date.now() } = req.body;

    if (!taskTypeEnum.includes(type)) {
        return res.status(400).json({
            status: false,
            message: 'Invalid task type',
            data: null
        });
    }

    if ((type === 'Query' || type === 'Task') && (!assignTo || assignTo.length === 0)) {
        return res.status(400).json({
            status: false,
            message: 'Assignee is required',
            data: null
        });
    }

    try {
        let idTracking = await IdTracking.findOne();
        if (!idTracking) {
            idTracking = await IdTracking.create({ trakingId: 0 });
        }

        idTracking.trakingId += 1;

        const newTask = new Task({
            topic,
            description,
            type,
            assigner: userId,
            assignTo: type === 'General' ? [] : assignTo,
            roomId: idTracking.trakingId,
            timeSent
        });

        await idTracking.save();
        await newTask.save();

        if (type === 'General') {
            const devices = await DeviceModel.find();
            devices.forEach(device => {
                scheduleNotification(device.deviceToken, topic, description, timeSent);
            });
        } else {
            const devices = await DeviceModel.find({ userId: { $in: assignTo } });
            devices.forEach(device => {
                scheduleNotification(device.deviceToken, topic, description, timeSent);
            });
        }

        return res.status(201).json({
            status: true,
            message: 'Task created successfully',
            data: newTask
        });
    } catch (error) {
        res.status(200).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

const getTasks = async (req, res) => {
    try {

        const { id, role } = req.user;

        let matchStage = {};
        if (role !== 'Admin') {
            matchStage = {
                $or: [
                    { assigner: id },
                    { assignTo: { $elemMatch: { id: id } } }
                ]
            };
        }

        const tasks = await Task.aggregate([
            {
                $match: matchStage
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assigner',
                    foreignField: 'id',
                    as: 'assignerDetails'
                }
            },
            {
                $unwind: '$assignerDetails'
            },
            {
                $project: {
                    id: 1,
                    topic: 1,
                    description: 1,
                    type: 1,
                    assigner: 1,
                    assignTo: 1,
                    timeSent: 1,
                    roomId: 1,
                    done: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'assignerDetails.name': 1,
                    'assignerDetails.mobileNumber': 1
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);
        return res.status(200).json({
            status: true,
            message: 'Tasks fetched successfully',
            data: tasks
        });
    } catch (error) {
        res.status(200).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

const getTaskById = async (req, res) => {
    try {
        const tasks = await Task.aggregate([
            { $match: { id: req.params.id } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assigner',
                    foreignField: 'id',
                    as: 'assignerDetails'
                }
            },
            {
                $unwind: '$assignerDetails'
            },
            {
                $project: {
                    id: 1,
                    topic: 1,
                    description: 1,
                    type: 1,
                    assigner: 1,
                    assignTo: 1,
                    timeSent: 1,
                    roomId: 1,
                    done: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'assignerDetails.name': 1,
                    'assignerDetails.mobileNumber': 1
                }
            }
        ]);

        if (tasks.length === 0) {
            return res.status(404).json({
                status: false,
                data: null,
                message: 'Task not found'
            });
        }
        return res.status(200).json({
            status: true,
            message: 'Task fetched successfully',
            data: tasks
        });
    } catch (error) {
        res.status(200).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

const updateTask = async (req, res) => {
    const { topic, description, type, assigner, assignTo, done } = req.body;

    if (!taskTypeEnum.includes(type)) {
        return res.status(400).json({
            status: false,
            data: null,
            message: 'Invalid task type'
        });
    }

    if ((type === 'Query' || type === 'Task') && (!assignTo || assignTo.length === 0)) {
        return res.status(400).json({
            status: false,
            data: null,
            message: 'assignTo is required for Query or Task types'
        });
    }

    try {
        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({
                status: false,
                data: null,
                message: 'Task not found'
            });
        }

        task.topic = topic || task.topic;
        task.description = description || task.description;
        task.type = type || task.type;
        task.assigner = assigner || task.assigner;
        task.assignTo = type === 'General' ? [] : assignTo || task.assignTo;
        task.done = done || task.done;

        await task.save();
        return res.status(200).json(task);
    } catch (error) {
        res.status(200).json({ error: 'Internal server error' });
    }
};

const updateTaskDoneStatus = async (req, res) => {
    try {

        const { status } = req.query

        if (!status) {
            return res.status(400).json({
                status: false,
                data: null,
                message: 'Status is required'
            });
        }

        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({
                status: false,
                data: null,
                message: 'Task not found'
            });
        }

        task.done = status;
        task.updatedAt = new Date();

        await task.save();
        res.status(200).json({
            status: true,
            message: 'Task status updated successfully',
            data: task
        });
    } catch (error) {
        console.error(error);
        res.status(200).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

const deleteTask = async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.id });
        if (!task) {
            return res.status(404).json({
                status: false,
                data: null,
                message: 'Task not found'
            });
        }

        await Task.deleteOne({ id: req.params.id });
        return res.status(200).json({
            status: true,
            message: 'Task deleted successfully',
            data: null
        });
    } catch (error) {
        res.status(200).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    updateTaskDoneStatus,
    deleteTask
};
