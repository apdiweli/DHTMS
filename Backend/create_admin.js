// Script to create initial Super Admin user
// Run this ONCE to create the first Super Admin account
// Usage: node create_admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@taxation.gov' });
        if (existingAdmin) {
            console.log('\n❌ Admin user already exists!');
            console.log('Email:', existingAdmin.email);
            console.log('Role:', existingAdmin.role);
            console.log('\n💡 You can login with this account or create other users through the system.');
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123', salt);

        const admin = await User.create({
            name: 'System Administrator',
            email: 'admin@taxation.gov',
            password: hashedPassword,
            role: 'Super Admin',
            jurisdiction: 'All Districts',
            status: 'Active',
            permissions: {
                canManageUsers: true,
                canAudit: true,
                canViewReports: true,
                canCreateProperty: true,
                canEditTaxRate: true,
                canProcessPayment: true
            }
        });

        console.log('\n✅ Super Admin created successfully!');
        console.log('━'.repeat(60));
        console.log('📧 Email:    ', admin.email);
        console.log('🔑 Password: ', 'Admin@123');
        console.log('👤 Role:     ', admin.role);
        console.log('━'.repeat(60));
        console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
        console.log('   1. Change this password immediately after first login!');
        console.log('   2. Use this account to create other users through the system.');
        console.log('   3. Public registration is DISABLED - only you can create users.');
        console.log('\n✓ You can now login at: http://localhost:5000/api/auth/login\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createAdmin();

