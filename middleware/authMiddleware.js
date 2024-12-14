const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: false,
            data: null,
            message: 'Unauthorized - Token not provided'
        });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: false,
            data: null,
            message: 'Unauthorized - Invalid token'
        });
    }
};

module.exports = verifyToken;
