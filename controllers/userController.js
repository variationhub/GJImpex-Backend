const { userEnum } = require("../contanst/data");
const User = require("../models/userModel");

// Create User
const createUser = async (req, res) => {
  try {
    const userData = req.body;

    if (!/^[a-zA-Z]+\s[a-zA-Z]+$/.test(userData.name)) {
      res.status(400).json({
        status: false,
        message: "Name must contain one space between first name and last name.",
        data: null
      })
      return;
    }


    if (!userEnum.includes(userData.role)) {
      res.status(400).json({
        status: false,
        message: `Role is not valid...!`,
        data: null
      })
      return;
    }

    if (!/^[0-9]{10}$/.test(userData.phone)) {
      res.status(400).json({
        status: false,
        message: "Phone number must be 10 digits",
        data: null
      })
      return;
    }

    if (userData.password.length < 6) {
      res.status(400).json({
        status: false,
        message: "Password is too short",
        data: null
      })
      return;
    }

    const user = await User.create(userData);
    res.status(201).json({
      status: true,
      data: user,
      message: "User created successfully"
    });

  } catch (error) {
    if (error.code === 11000) {
      const duplicateKeyField = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        status: false,
        data: null,
        message: `${duplicateKeyField} number is already exists.`,
      });
    }

    res.status(500).json({
      status: false,
      data: null,
      message: error.message
    });
  }
};

// Update User
const updateUser = async (req, res) => {
  const userId = req.params.id;
  const userData = req.body;
  if (userData.name && !/^[a-zA-Z]+\s[a-zA-Z]+$/.test(userData.name)) {
    res.status(400).json({
      status: false,
      message: "Name must contain one space between first name and last name.",
      data: null
    })
    return;
  }


  if (userData.role && !userEnum.includes(userData.role)) {
    res.status(400).json({
      status: false,
      message: `${userData.role} is not valid role`,
      data: null
    })
    return;
  }

  if (userData.phone && !/^[0-9]{10}$/.test(userData.phone)) {
    res.status(400).json({
      status: false,
      message: "Phone number must be 10 digits",
      data: null
    })
    return;
  }

  if (userData.password && userData.password.length < 6) {
    res.status(400).json({
      status: false,
      message: "Password is too short",
      data: null
    })
    return;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, userData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        data: null,
        message: "User not found"
      });
    }

    res.json({
      status: true,
      data: updatedUser,
      message: "User update successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: 'Error updating user'
    });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
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
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  const userId = req.params.id;
  try {
    const deletedUser = await User.findByIdAndDelete(userId);

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
