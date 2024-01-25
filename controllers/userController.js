const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.createUser = async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      isAdmin: req.body.isAdmin || false,
    });

    await user.save();
    res.status(201).send({ message: 'User created successfully.' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(404).send({ message: 'User not found.' });

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(401).send({ message: 'Invalid password.' });

    const token = jwt.sign({ id: user._id }, 'your-secret-key', { expiresIn: 86400 }); // 24 hours
    res.status(200).send({ auth: true, token: token });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
