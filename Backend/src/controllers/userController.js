const User = require('../models/User');
const bcrypt = require('bcryptjs');
const SystemSettings = require('../models/SystemSettings');

// Get all users (staff members)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password') // Exclude password from response
            .sort({ createdAt: -1 });

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        // Access Control: Allow Super Admin, Tax Officer, or Account Owner
        if (
            req.user.role !== 'Super Admin' &&
            req.user.role !== 'Tax Officer' &&
            req.user._id.toString() !== req.params.id
        ) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this profile' });
        }

        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new user
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, jurisdiction, status, permissions } = req.body;

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

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'Owner',
            jurisdiction: jurisdiction || 'All Districts',
            status: status || 'Active',
            permissions: permissions || {},
            createdBy: req.user ? req.user._id : null
        });

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({ success: true, data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, jurisdiction, status, permissions, password } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (jurisdiction) user.jurisdiction = jurisdiction;
        if (status) user.status = status;
        if (permissions) user.permissions = permissions;

        // Update password if provided
        if (password) {
            // Get system settings for password validation
            const settings = await SystemSettings.getSettings();

            // Validate password length
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

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        if (req.user) {
            user.updatedBy = req.user._id;
        }

        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ success: true, data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update user permissions only
exports.updateUserPermissions = async (req, res) => {
    try {
        const { permissions } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.permissions = permissions;
        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ success: true, data: userResponse, message: 'Permissions updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Active', 'Suspended', 'Inactive'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.status = status;
        await user.save();

        // Notify admins if Tax Officer status changes
        if (user.role === 'Tax Officer') {
            try {
                const notificationService = require('../services/notificationService');
                await notificationService.notifyOfficerStatus(user, status);
            } catch (notifError) {
                console.error('Failed to send officer status notification:', notifError);
            }
        }

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ success: true, data: userResponse, message: 'Status updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deletion of Super Admin
        if (user.role === 'Super Admin') {
            return res.status(403).json({ success: false, message: 'Cannot delete Super Admin account' });
        }

        const Owner = require('../models/Owner');
        const Property = require('../models/Property');

        // Check 1: If user is Tax Officer/Admin, check if they CREATED records
        const propertiesCreated = await Property.countDocuments({ createdBy: user._id });
        const ownersCreated = await Owner.countDocuments({ createdBy: user._id });

        if (propertiesCreated > 0 || ownersCreated > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete user. This user has registered ${ownersCreated} owners and ${propertiesCreated} properties. Please reassign their records before deletion.`
            });
        }

        // Check 2: If user is linked to an Owner profile, check if that Owner has properties
        const linkedOwner = await Owner.findOne({ userId: user._id });
        if (linkedOwner) {
            const ownerProperties = await Property.countDocuments({ ownerId: linkedOwner._id });
            if (ownerProperties > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete user. This account is linked to an Owner profile with ${ownerProperties} properties.`
                });
            }
            // Optional: If safe to delete, also delete the linked owner record to prevent orphans?
            // For now, we just proceed to delete the user. The owner record will remain but unlink.
            // Or we could enforce deleting from the Owner view instead. 
            // Let's safe delete the owner record too if it has no properties, to keep data clean,
            // matching the logic in ownerController where deleting owner deletes user.
            await Owner.findByIdAndDelete(linkedOwner._id);
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get users by role
exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;

        const users = await User.find({ role })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reset owner password (Tax Officer resets for owners they created)
exports.resetOwnerPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'New password is required' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'Owner') {
            return res.status(400).json({ success: false, message: 'Can only reset passwords for Owner accounts' });
        }

        // Tax Officers can only reset passwords for owners they created
        if (req.user.role === 'Tax Officer') {
            if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'You can only reset passwords for owners you created' });
            }
        }

        // Validate password
        const settings = await SystemSettings.getSettings();
        if (newPassword.length < settings.minimumPasswordLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${settings.minimumPasswordLength} characters long`
            });
        }

        if (newPassword.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'Password must not exceed 16 characters'
            });
        }

        // Hash and save
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: `Password reset successfully for ${user.name}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Owner changes their own password
exports.changeOwnPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // Validate new password
        const settings = await SystemSettings.getSettings();
        if (newPassword.length < settings.minimumPasswordLength) {
            return res.status(400).json({
                success: false,
                message: `New password must be at least ${settings.minimumPasswordLength} characters long`
            });
        }

        if (newPassword.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'Password must not exceed 16 characters'
            });
        }

        // Hash and save
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
