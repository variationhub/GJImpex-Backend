const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/userModel'); // Adjust the path based on your project structure

const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        const token = jwt.sign(
            {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
            process.env.SECRET,
            {
                expiresIn: "24h",
            }
        );

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = login;
