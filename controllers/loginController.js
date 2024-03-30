const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/userModel'); // Adjust the path based on your project structure

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

module.exports = login;
