const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const { generateTaxRecord } = require('./src/controllers/taxController');
require('dotenv').config();

// Mock Request/Response with error capture
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
        const mongoPassword = process.env.MONGODB_PASSWORD;
        const MONGODB_URI = mongoPassword
            ? process.env.MONGODB_URI_BASE.replace('PASSWORD', encodeURIComponent(mongoPassword))
            : process.env.MONGODB_URI || process.env.MONGODB_URI_BASE;

        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a test property
        let property = await Property.findOne();
        if (!property) {
            console.log('No properties found.');
            return;
        }
        console.log(`Testing with Property: ${property.address}`);

        // Mock Req
        let req = {
            body: { propertyId: property._id, year: 2026 },
            user: { role: 'Super Admin', name: 'Test Bot', jurisdiction: property.district }
        };
        let res = mockRes();

        console.log('Calling generateTaxRecord...');
        try {
            await generateTaxRecord(req, res);

            if (res.statusCode === 500) {
                console.log('❌ CAUGHT 500 ERROR IN RESPONSE DATA:');
                console.log(res.data);
            } else if (res.statusCode >= 400) {
                console.log(`❌ Request failed with status ${res.statusCode}:`, res.data);
            } else {
                console.log('✅ Success:', res.data);
            }

        } catch (filescopeError) {
            console.log('❌ UNHANDLED ERROR IN CONTROLLER CALL:');
            console.log(filescopeError);
        }

    } catch (error) {
        console.error('Test Setup Failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected');
    }
};

runTest();
