const mongoose = require('mongoose');
const Property = require('./src/models/Property');
const Owner = require('./src/models/Owner');
const TaxRule = require('./src/models/TaxRule');
const { calculateTaxForProperty } = require('./src/services/taxCalculator');
require('dotenv').config();
const fs = require('fs');

const runTest = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/house_tax_db');

        let output = '\n--- TESTING TAX CALCULATION LOGIC ---\n';

        const mockOwner = { _id: new mongoose.Types.ObjectId() };

        // Setup Rules
        await TaxRule.deleteMany({});
        await TaxRule.create([
            { ruleName: 'Apartment Unit', propertyType: 'Residential', buildingType: 'Apartment', calculationMethod: 'PerUnit', rate: 10 },
            { ruleName: 'Luxury Villa', propertyType: 'Residential', buildingType: 'Luxury Villa', calculationMethod: 'Percentage', rate: 0.5 },
            { ruleName: 'Warehouse', propertyType: 'Industrial', buildingType: 'Warehouse', calculationMethod: 'PerM2', rate: 1 },
            { ruleName: 'Mosque', propertyType: 'Religious', buildingType: 'Mosque', calculationMethod: 'Exempt', rate: 0 },
        ]);

        // TEST CASE 1: Apartment (Per Unit Tax)
        const apartment = {
            propertyType: 'Residential',
            buildingType: 'Apartment',
            structureDetails: { floors: 4, unitsPerFloor: 2, totalUnits: 8 },
            ownerId: mockOwner._id,
        };
        let result = await calculateTaxForProperty(apartment);
        output += `\n1. Apartment (8 units @ $10/unit):\nExpected: 80. Actual: ${result.amount}\nBreakdown: ${result.breakdown.details}\n`;

        // TEST CASE 2: Luxury Villa (Percentage)
        const villa = {
            propertyType: 'Residential',
            buildingType: 'Luxury Villa',
            value: 200000,
            ownerId: mockOwner._id,
        };
        result = await calculateTaxForProperty(villa);
        output += `\n2. Luxury Villa ($200k Value @ 0.5%):\nExpected: 1000. Actual: ${result.amount}\nBreakdown: ${result.breakdown.details}\n`;

        // TEST CASE 3: Warehouse (Per M2)
        const warehouse = {
            propertyType: 'Industrial',
            buildingType: 'Warehouse',
            structureDetails: { totalFloorArea: 1000 },
            ownerId: mockOwner._id,
        };
        result = await calculateTaxForProperty(warehouse);
        output += `\n3. Warehouse (1000m2 @ $1/m2):\nExpected: 1000. Actual: ${result.amount}\nBreakdown: ${result.breakdown.details}\n`;

        // TEST CASE 4: Mosque (Exempt)
        const mosque = {
            propertyType: 'Religious',
            buildingType: 'Mosque',
            ownerId: mockOwner._id,
        };
        result = await calculateTaxForProperty(mosque);
        output += `\n4. Mosque (Exempt):\nExpected: 0. Actual: ${result.amount}\nBreakdown: ${result.breakdown.details}\n`;

        // TEST CASE 5: Empty Land
        await TaxRule.create({ ruleName: 'General Land', propertyType: 'Residential', buildingType: null, calculationMethod: 'PerM2', rate: 0.1 });
        const land = {
            propertyType: 'Residential',
            buildingType: 'Empty Land',
            landDetails: { landCount: 2, totalAreaSqm: 600 },
            structureDetails: { totalFloorArea: 0 }
        };
        result = await calculateTaxForProperty(land);
        output += `\n5. General Land (600m2 @ $0.1/m2):\nExpected: 60. Actual: ${result.amount}\nBreakdown: ${result.breakdown.details}\n`;

        fs.writeFileSync('verification_results.txt', output);
        console.log('Verification finished.');

    } catch (err) {
        console.error(err);
        fs.writeFileSync('verification_results.txt', 'Error: ' + err.message);
    } finally {
        mongoose.connection.close();
    }
};

runTest();
