/**
 * createAdmin.js
 * Run once to seed the Super Admin user into MongoDB.
 * Usage: node src/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_EMAIL = 'alizakifarah@gmail.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'System Administrator';

async function createAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        // Build URI with properly encoded password
        const mongoPassword = process.env.MONGODB_PASSWORD;
        const MONGODB_URI = mongoPassword
            ? process.env.MONGODB_URI_BASE.replace('PASSWORD', encodeURIComponent(mongoPassword))
            : process.env.MONGODB_URI || process.env.MONGODB_URI_BASE;

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            console.log(`⚠️  Admin user already exists: ${ADMIN_EMAIL}`);
            console.log('   No changes made. If you forgot the password, delete the user and re-run.');
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        // Create the Super Admin
        const admin = await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'Super Admin',
            jurisdiction: 'All Districts',
            status: 'Active',
        });

        console.log('\n🎉 Super Admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  📧 Email    : ${ADMIN_EMAIL}`);
        console.log(`  🔑 Password : ${ADMIN_PASSWORD}`);
        console.log(`  👤 Role     : ${admin.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ⚠️  Change your password after first login!');

        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB. Done!');
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createAdmin();
