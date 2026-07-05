const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const Owner = require('./src/models/Owner');
require('dotenv').config();

const verifyPopulation = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/house_tax_db');
        console.log('Connected to DB');

        // 1. Create a dummy owner
        await Owner.deleteMany({ email: 'test@owner.com' });
        const owner = await Owner.create({
            id: 'TEST-OWN-001',
            name: 'Test Owner Populated',
            type: 'Individual',
            contact: 'test@owner.com',
            phone: '123456789',
            district: 'Test District'
        });
        console.log('Owner Created:', owner._id, owner.name);

        // 2. Create a dummy property linked to owner
        // Ensure we use the new required fields
        const property = await Property.create({
            ownerId: owner._id,
            address: '123 Test St',
            district: 'Test District',
            propertyType: 'Residential',
            buildingType: 'Apartment',
            value: 100000,
            landDetails: { landCount: 1, totalAreaSqm: 300 },
            structureDetails: { floors: 1, unitsPerFloor: 1, totalUnits: 1, totalFloorArea: 100 }
        });
        console.log('Property Created:', property._id);

        // 3. Fetch property and Populate Owner
        const fetchedProp = await Property.findById(property._id).populate('ownerId', 'name type');
        console.log('\n--- FETCH RESULT ---');
        if (fetchedProp.ownerId && fetchedProp.ownerId.name) {
            console.log('SUCCESS: Owner Populated!');
            console.log('Owner Name:', fetchedProp.ownerId.name);
            console.log('Owner Type:', fetchedProp.ownerId.type);
        } else {
            console.log('FAILURE: Owner NOT Populated');
            console.log('fetchedProp.ownerId:', fetchedProp.ownerId);
        }

        // Cleanup
        await Property.deleteOne({ _id: property._id });
        await Owner.deleteOne({ _id: owner._id });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.connection.close();
    }
};

verifyPopulation();
