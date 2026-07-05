const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createAuditLog } = require('./auditController');
const SystemSettings = require('../models/SystemSettings');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Get system settings for password validation
        const settings = await SystemSettings.getSettings();

        // Validate password length against system settings
        if (password.length < settings.minimumPasswordLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${settings.minimumPasswordLength} characters long`
            });
        }

        if (password.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'Password must not exceed 16 characters'
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Get system settings
        const settings = await SystemSettings.getSettings();

        const user = await User.findOne({ email });

        if (!user) {
            // Log failed login attempt
            await createAuditLog({
                userName: email,
                action: 'LOGIN_FAIL',
                targetType: 'System',
                details: `Failed login attempt for email: ${email} (User not found)`,
                ipAddress: req.ip,
                severity: 'Medium'
            });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if password matches
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Log failed login attempt
            await createAuditLog({
                userId: user._id,
                userName: user.name,
                userRole: user.role,
                action: 'LOGIN_FAIL',
                targetType: 'System',
                details: `Failed login attempt for ${user.name} (Invalid password)`,
                ipAddress: req.ip,
                severity: 'High'
            });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check user status
        if (user.status === 'Suspended') {
            return res.status(403).json({
                message: 'Your account has been suspended. Please contact the administrator.'
            });
        }

        if (user.status === 'Inactive') {
            return res.status(403).json({
                message: 'Your account is inactive. Please contact the administrator.'
            });
        }

        // Log successful login
        await createAuditLog({
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            action: 'LOGIN_SUCCESS',
            targetType: 'System',
            details: `User ${user.name} logged in successfully`,
            ipAddress: req.ip,
            severity: 'Low'
        });

        // User is valid and active, generate token
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            jurisdiction: user.jurisdiction,
            permissions: user.permissions,
            token: generateToken(user._id),
            twoFactorRequired: settings.twoFactorEnabled, // Inform frontend if 2FA is required
            message: settings.twoFactorEnabled ? 'Two-Factor Authentication is enabled for this system' : undefined
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


