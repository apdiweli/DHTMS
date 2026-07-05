const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token and checks user status
 */
const protect = async (req, res, next) => {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database (exclude password)
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found. Token is invalid.'
                });
            }

            // Check if user account is active
            if (user.status !== 'Active') {
                return res.status(403).json({
                    success: false,
                    message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`
                });
            }

            // Attach user to request object
            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Please login again.'
                });
            }

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired. Please login again.'
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route.'
            });
        }
    } else {
        return res.status(401).json({
            success: false,
            message: 'No token provided. Please login to access this route.'
        });
    }
};

/**
 * Authorization Middleware
 * Checks if user has required role(s)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated. Please login first.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This resource requires one of the following roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = { protect, authorize };
