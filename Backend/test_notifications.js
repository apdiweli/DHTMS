const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Notification = require('./src/models/Notification');
const Owner = require('./src/models/Owner');
const User = require('./src/models/User');

async function testNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');

        // Check if there are any notifications
        const notifications = await Notification.find().populate('userId', 'name email role');
        console.log('\n=== NOTIFICATIONS IN DATABASE ===');
        console.log(`Total notifications: ${notifications.length}`);

        if (notifications.length > 0) {
            notifications.forEach((notif, index) => {
                console.log(`\n--- Notification ${index + 1} ---`);
                console.log(`Type: ${notif.type}`);
                console.log(`Title: ${notif.title}`);
                console.log(`Message: ${notif.message}`);
                console.log(`User: ${notif.userId?.name} (${notif.userId?.email})`);
                console.log(`Read: ${notif.isRead}`);
                console.log(`Created: ${notif.createdAt}`);
            });
        } else {
            console.log('No notifications found in database.');
        }

        // Check owners and their linked user accounts
        console.log('\n\n=== OWNERS AND USER ACCOUNTS ===');
        const owners = await Owner.find().populate('userId', 'name email role');
        console.log(`Total owners: ${owners.length}`);

        let ownersWithAccounts = 0;
        let ownersWithoutAccounts = 0;

        owners.forEach((owner, index) => {
            console.log(`\n--- Owner ${index + 1} ---`);
            console.log(`Name: ${owner.name}`);
            console.log(`ID: ${owner.id || 'N/A'}`);
            if (owner.userId) {
                console.log(`✓ Linked User Account: ${owner.userId.name} (${owner.userId.email}) - Role: ${owner.userId.role}`);
                ownersWithAccounts++;
            } else {
                console.log(`✗ NO LINKED USER ACCOUNT - Cannot receive notifications!`);
                ownersWithoutAccounts++;
            }
        });

        console.log(`\n\nSummary:`);
        console.log(`Owners with user accounts: ${ownersWithAccounts}`);
        console.log(`Owners without user accounts: ${ownersWithoutAccounts}`);

        // Check all users with Owner role
        console.log('\n\n=== USERS WITH OWNER ROLE ===');
        const ownerUsers = await User.find({ role: 'Owner' });
        console.log(`Total users with Owner role: ${ownerUsers.length}`);
        ownerUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed.');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testNotifications();
