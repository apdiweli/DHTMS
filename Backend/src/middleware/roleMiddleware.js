/**
 * Role-based Authorization Middleware
 * Restricts access to routes based on user roles
 * Must be used after the protect middleware
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if user exists (should be set by protect middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated.'
            });
        }

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

module.exports = { authorize };
