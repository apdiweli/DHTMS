const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const { calculateTaxForProperty } = require('./src/services/taxCalculator');

async function testRecalc() {
    try {
        await mongoose.connect('mongodb://localhost:27017/house_tax_db');

        // 1. Create a VALID property with 0 tax
        const prop = await Property.create({
            ownerId: new mongoose.Types.ObjectId(),
            address: 'Recalc Test St',
            district: 'Hodan',
            propertyType: 'Residential',
            buildingType: 'Apartment',
            value: 200000,
            calculatedTax: 0, // Explicitly 0
            landDetails: { landCount: 1, totalAreaSqm: 300 },
            structureDetails: { floors: 1, unitsPerFloor: 1, totalUnits: 1, totalFloorArea: 100 }
        });
        console.log("Created Property:", prop._id, "Tax:", prop.calculatedTax);

        // 2. Run logic (simulate controller)
        const taxResult = await calculateTaxForProperty(prop);
        prop.calculatedTax = taxResult.amount;
        prop.taxDetails = {
            rule: taxResult.breakdown.rule,
            rate: taxResult.breakdown.rate,
            method: taxResult.breakdown.method,
            breakdown: taxResult.breakdown.details,
            lastCalculated: new Date()
        };
        await prop.save();

        console.log("Updated Property:", prop._id, "New Tax:", prop.calculatedTax);

        if (prop.calculatedTax > 0) {
            console.log("SUCCESS: Tax updated.");
        } else {
            console.log("FAILURE: Tax remains 0.");
        }

        // Cleanup
        await Property.deleteOne({ _id: prop._id });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

testRecalc();
