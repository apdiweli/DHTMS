const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const notificationService = require('./src/services/notificationService');
const User = require('./src/models/User');
const Owner = require('./src/models/Owner');
const Property = require('./src/models/Property');
const TaxRecord = require('./src/models/TaxRecord');

async function testAdminNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected\n');

        // Create a Mock Admin if not exists (so we have someone to notify)
        let admin = await User.findOne({ role: 'Super Admin' });
        if (!admin) {
            console.log('Creating temp Super Admin for test...');
            admin = await User.create({
                name: 'Test Admin',
                email: 'testadmin@example.com',
                password: 'password123',
                role: 'Super Admin',
                status: 'Active'
            });
        }
        console.log(`Testing notifications for Admin: ${admin.name} (${admin.email})`);

        // 1. Test Large Tax Notification
        console.log('\n1. Testing Large Tax Notification...');
        const mockProperty = {
            _id: new mongoose.Types.ObjectId(),
            address: '123 Luxury Estate',
            ownerId: new mongoose.Types.ObjectId() // fake owner
        };
        const mockTaxRecord = {
            _id: new mongoose.Types.ObjectId(),
            amount: 7500.00,
            taxAccountNumber: 'TAN-2024-TEST-999',
            taxYear: 2024
        };

        await notificationService.notifyLargeTax(mockTaxRecord, mockProperty);
        console.log('✓ Large Tax notification sent');

        // 2. Test Officer Status Notification
        console.log('\n2. Testing Officer Status Notification...');
        const mockOfficer = {
            _id: new mongoose.Types.ObjectId(),
            name: 'John Officer',
            email: 'john.officer@example.com'
        };
        await notificationService.notifyOfficerStatus(mockOfficer, 'Suspended');
        console.log('✓ Officer Status notification sent');

        // 3. Test Owner Action Notification
        console.log('\n3. Testing Owner Action Notification...');
        const mockOwner = {
            _id: new mongoose.Types.ObjectId(),
            name: 'Alice Owner',
            id: 'OW-12345'
        };
        await notificationService.notifyOwnerAction(mockOwner, 'Blocked');
        console.log('✓ Owner Blocked notification sent');

        // Verify notifications in DB
        console.log('\nVerifying database records...');
        const notifications = await require('./src/models/Notification').find({
            userId: admin._id,
            isRead: false
        }).sort({ createdAt: -1 }).limit(3);

        if (notifications.length >= 3) {
            console.log('SUCCESS: All 3 test notifications found in DB!');
            notifications.forEach(n => {
                console.log(`- [${n.type}] ${n.title}: ${n.message}`);
            });
            console.log('\nLog in as Admin to see these in the frontend Notifications page.');
        } else {
            console.log(`WARNING: Only found ${notifications.length} notifications. Something might have failed.`);
        }

        await mongoose.connection.close();

    } catch (error) {
        console.error('ERROR:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    }
}

testAdminNotifications();
