const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const TaxRecord = require('./src/models/TaxRecord');
const Owner = require('./src/models/Owner');
const { generateTaxRecord } = require('./src/controllers/taxController');
require('dotenv').config();

// Mock Request/Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a test property
        let property = await Property.findOne();
        if (!property) {
            console.error('No properties found. Please run the app and create one first.');
            process.exit(1);
        }
        console.log(`Testing with Property: ${property.address} (${property._id})`);

        // 2. Generate Tax Record (First Time - Should Succeed or already exist)
        console.log('\n--- Attempt 1: Generate Tax ---');
        let req = {
            body: { propertyId: property._id, year: 2024 },
            user: { role: 'Super Admin', name: 'Test Bot' } // Mock user
        };
        let res = mockRes();

        await generateTaxRecord(req, res);

        if (res.statusCode && res.statusCode !== 200) {
            console.log(`Result: ${res.statusCode} - ${res.data.error || res.data.message}`);
        } else {
            console.log('Result: Success - Tax Generated');
        }

        // 3. Generate Tax Record AGAIN (Should Fail)
        console.log('\n--- Attempt 2: Duplicate Tax Generation ---');
        res = mockRes(); // Reset response object
        await generateTaxRecord(req, res);

        if (res.statusCode === 400) {
            console.log('✅ PASS: Duplicate generation blocked.');
            console.log(`Error Message: ${res.data.error}`);
        } else {
            console.log('❌ FAIL: Duplicate generation NOT blocked.');
            console.log(`Status: ${res.statusCode}, Data:`, res.data);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected');
    }
};

runTest();
