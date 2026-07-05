const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const notificationService = require('./src/services/notificationService');
const Owner = require('./src/models/Owner');
const Property = require('./src/models/Property');
const TaxRecord = require('./src/models/TaxRecord');

async function testNotificationCreation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected\n');

        // Get a sample owner with userId
        const owner = await Owner.findOne({ userId: { $exists: true, $ne: null } });

        if (!owner) {
            console.log('ERROR: No owner with linked user account found!');
            console.log('Please create an owner with a linked user account first.');
            await mongoose.connection.close();
            return;
        }

        console.log(`Found owner: ${owner.name}`);
        console.log(`Owner userId: ${owner.userId}`);

        // Create a test notification
        console.log('\n--- Testing notification creation ---');
        const testNotif = await notificationService.createNotification(
            owner.userId,
            'TAX_GENERATED',
            'Test Notification',
            'This is a test notification to verify the system works.',
            { amount: 100, taxYear: 2024 },
            'high'
        );

        console.log('✓ Test notification created successfully!');
        console.log(`Notification ID: ${testNotif._id}`);
        console.log(`Title: ${testNotif.title}`);
        console.log(`Message: ${testNotif.message}`);

        // Verify it was saved
        const Notification = require('./src/models/Notification');
        const count = await Notification.countDocuments();
        console.log(`\nTotal notifications in database: ${count}`);

        // Get the notification
        const savedNotif = await Notification.findById(testNotif._id).populate('userId', 'name email');
        console.log(`\nRetrieved notification for user: ${savedNotif.userId.name} (${savedNotif.userId.email})`);

        await mongoose.connection.close();
        console.log('\n✓ Test completed successfully!');
        console.log('\nIf you can see this notification in the frontend, the system is working.');
        console.log('If not, check the frontend console for errors.');

    } catch (error) {
        console.error('ERROR:', error);
        await mongoose.connection.close();
    }
}

testNotificationCreation();
