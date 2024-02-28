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
        if (req.baseUrl === '/api/users' && req.user.role !== 'Admin') {
            return res.status(403).json({
                status: false,
                data: null,
                message: 'Forbidden - Only Admins can perform this operation'
            });
        }

        if (
            (req.baseUrl === '/api/orders' && req.method === 'POST' && !['Admin', 'Sales'].includes(req.user.role)) ||
            (req.baseUrl.startsWith('/api/orders/') && req.method === 'DELETE' && !['Admin', 'Sales'].includes(req.user.role))
        ) {
            return res.status(403).json({
                status: false,
                data: null,
                message: 'Forbidden - Only Admins or Sales can perform this operation on orders'
            });
        }

        if (
            ((req.baseUrl === '/api/products' || req.baseUrl === '/api/transports') && req.method !== 'GET' && req.user.role !== 'Admin')
        ) {
            return res.status(403).json({
                status: false,
                data: null,
                message: 'Forbidden - Only Admins can perform this operation on products'
            });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({
            status: false,
            data: null,
            message: 'Unauthorized - Invalid token'
        });
    }
};

module.exports = verifyToken;
