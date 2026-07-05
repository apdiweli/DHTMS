const notificationService = require('./notificationService');
const mongoose = require('mongoose');

// Mock Data
const mockTaxRecord = {
    _id: new mongoose.Types.ObjectId(),
    amount: 150.00,
    taxYear: 2024,
    taxAccountNumber: 'TAN-2024-TEST-001'
};

const mockProperty = {
    _id: new mongoose.Types.ObjectId(),
    address: '123 Test St, Test City'
};

const mockOwner = {
    _id: new mongoose.Types.ObjectId(),
    name: 'John Doe',
    email: 'test@example.com',
    phone: '+1234567890'
};

async function test() {
    console.log('Starting Notification Test...');
    try {
        // We expect this to fail DB save if we don't connect to DB, 
        // BUT notificationService tries to save to DB.
        // We should just check if it calls the services. 
        // Actually, createNotification does `new Notification(...).save()`.
        // So we need a DB connection or we mock the model.

        // Since connecting to the real DB might be risky or complex (env vars), 
        // avoiding full DB interaction is better if possible.
        // However, the code `await notification.save()` will throw if not connected.

        // Let's just mock the Notification model inside notificationService? 
        // Too complex to modify the service just for test.

        // Alternative: Verify via inspection and trust the user to test end-to-end, 
        // OR assume the user has a local DB running (which they do) and connecting is fine.

        require('dotenv').config({ path: '../../.env' });
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/house_taxation_db');

        await notificationService.notifyTaxGenerated(mockTaxRecord, mockProperty, mockOwner);

        console.log('Test function executed. Check above for Mock Service logs.');
        process.exit(0);
    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
}

test();
