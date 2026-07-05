const mongoose = require('mongoose');
const axios = require('axios');
const Property = require('./src/models/Property');

async function fixAndRecalc() {
    try {
        await mongoose.connect('mongodb://localhost:27017/house_tax_db');
        console.log("Connected to DB for patching...");

        // 1. Patch missing data (Robust check for missing, null, or empty propertyType)
        const res = await Property.updateMany(
            {
                $or: [
                    { propertyType: { $exists: false } },
                    { propertyType: null },
                    { propertyType: "" }
                ]
            },
            {
                $set: {
                    propertyType: 'Residential',
                    buildingType: 'Apartment',
                    structureDetails: { floors: 1, unitsPerFloor: 1, totalUnits: 1, totalFloorArea: 100 },
                    landDetails: { landCount: 1, totalAreaSqm: 300 }
                }
            }
        );
        console.log(`Patched ${res.modifiedCount} legacy properties.`);

        // 2. Trigger Recalc via API (to ensure full logic runs)
        console.log("Triggering API Recalculation...");
        const apiRes = await axios.post('http://localhost:5000/api/taxes/recalculate-all');
        console.log("Recalc Result:", apiRes.data);

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        mongoose.connection.close();
    }
}

fixAndRecalc();
