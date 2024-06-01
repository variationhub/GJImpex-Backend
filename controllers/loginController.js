const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/userModel'); // Adjust the path based on your project structure
const { generatePass } = require('../services/utils');
const { emailHelper } = require('../services/emailServices');

const login = async (req, res) => {
    try {
        const { mobileNumber, password, email } = req.body;

        let user;

        if (mobileNumber) {
            user = await User.findOne({ mobileNumber });
        }
        if (email) {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(401).json({
                status: false,
                data: null,
                message: 'Invalid credentials'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                status: false,
                data: null,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                email: user.email,
                role: user.role,
            },
            process.env.SECRET,
            {
                expiresIn: 60 * 60 * 23
            }
        );

        res.json({
            status: true,
            token,
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: null,
            message: 'Internal server error'
        });
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                status: false,
                data: null
            })
        }

        const newPassword = generatePass();
        user.password = newPassword;

        await user.save();
        emailHelper(email, newPassword).then(data => console.log(data)).catch(err => console.log(err));

        return res.status(200).json({
            message: "Email sent successfully",
            status: true,
            data: null
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
            status: false,
            data: null
        });
    }
}

module.exports = {
    login,
    forgotPassword
};
