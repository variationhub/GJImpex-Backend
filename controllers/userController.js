const { userEnum } = require("../contanst/data");
const User = require("../models/userModel");
// const main = require("../services/emailServices");

// Create User
const createUser = async (req, res) => {
  try {
    const userData = req.body;

    const requiredFields = ['name', 'nickName', 'email', 'password', 'mobileNumber', 'role'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
        data: null
      });
    }

    if (!userEnum.includes(userData.role)) {
      return res.status(400).json({
        status: false,
        message: `Role is not valid...!`,
        data: null
      });
    }

    if (!/^[0-9]{10}$/.test(userData.mobileNumber)) {
      return res.status(400).json({
        status: false,
        message: "Phone number must be 10 digits",
        data: null
      });
    }

    if (userData.password.length <= 6) {
      return res.status(400).json({
        status: false,
        message: "Password is too short",
        data: null
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { mobileNumber: userData.mobileNumber },
        { nickName: userData.nickName }
      ]
    });

    if (existingUser) {
      const duplicateFields = [];
      if (existingUser.email === userData.email) duplicateFields.push('Email');
      if (existingUser.mobileNumber === userData.mobileNumber) duplicateFields.push('Mobile Number');
      if (existingUser.nickName === userData.nickName) duplicateFields.push('Nick Name');

      return res.status(400).json({
        status: false,
        message: `${duplicateFields.join(', ')} already exists`,
        data: null
      });
    }

    // Create the user if all checks pass
    const user = await User.create(userData);

    // main("dhruvsuhagiya111@gmail.com").catch(err => console.log(err));

    return res.status(201).json({
      status: true,
      data: user,
      message: "User created successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingUser = await User.findOne({ id });
    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null
      });
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({
        status: false,
        message: "Minimum one field is required",
        data: null
      });
    }

    if (updateData.role && !userEnum.includes(updateData.role)) {
      return res.status(400).json({
        status: false,
        message: `Role is not valid...!`,
        data: null
      });
    }

    if (updateData.mobileNumber && !/^[0-9]{10}$/.test(updateData.mobileNumber)) {
      return res.status(400).json({
        status: false,
        message: "Phone number must be 10 digits",
        data: null
      });
    }

    if (updateData.password && updateData.password.length <= 6) {
      return res.status(400).json({
        status: false,
        message: "Password is too short",
        data: null
      });
    }

    Object.assign(existingUser, updateData);
    await existingUser.save();

    return res.status(200).json({
      status: true,
      data: existingUser,
      message: "User updated successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};


// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json({
      status: true,
      data: users,
      message: "Users fetch successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error updating user'
    });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "User not found"
      });
    }
    res.json({
      status: true,
      data: user,
      message: "User found successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error fetching user',
      data: null
    });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await User.findOneAndDelete({ id });

    if (!deletedUser) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "User not found"
      });
    }
    res.json({
      status: true,
      data: deletedUser,
      message: "User delete successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error deleting user'
    });
  }
};

module.exports = {
  createUser,
  updateUser,
  getAllUsers,
  getUserById,
  deleteUser,
};
