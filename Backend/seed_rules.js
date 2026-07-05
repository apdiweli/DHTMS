const mongoose = require('mongoose');
const TaxRule = require('./src/models/TaxRule');
require('dotenv').config();

const seedRules = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/house_tax_db');
        console.log('Connected to DB for seeding...');

        await TaxRule.deleteMany({}); // Clear old rules

        const rules = [
            // RESIDENTIAL
            { ruleName: 'Apartment Unit Tax', propertyType: 'Residential', buildingType: 'Apartment', calculationMethod: 'PerUnit', rate: 10, description: '$10 per unit (calculated as floors × units per floor)' },
            { ruleName: 'Villa', propertyType: 'Residential', buildingType: 'Villa', calculationMethod: 'PerM2', rate: 0.5, description: '$0.5 per square meter of built area' },
            { ruleName: 'Luxury Villa', propertyType: 'Residential', buildingType: 'Luxury Villa', calculationMethod: 'Percentage', rate: 0.5, description: '0.5% of Property Value' },
            { ruleName: 'Corrugated House', propertyType: 'Residential', buildingType: 'Corrugated Sheet House', calculationMethod: 'Fixed', rate: 15, description: 'Fixed tax for Jiingad' },
            { ruleName: 'Mixed-Use Residential', propertyType: 'Residential', buildingType: 'Mixed-use', calculationMethod: 'PerUnit', rate: 10, description: 'Fallback for residential floors in mixed buildings' },



            // INDUSTRIAL
            { ruleName: 'Factory Fixed', propertyType: 'Industrial', buildingType: 'Factory', calculationMethod: 'Fixed', rate: 500, description: 'Fixed annual tax' },
            { ruleName: 'Warehouse Area', propertyType: 'Industrial', buildingType: 'Warehouse', calculationMethod: 'PerM2', rate: 1, description: '$1 per square meter' },
            { ruleName: 'Workshop Fixed', propertyType: 'Industrial', buildingType: 'Workshop', calculationMethod: 'Fixed', rate: 100, description: 'Small workshop fixed tax' },

            // AGRICULTURAL
            { ruleName: 'Farm', propertyType: 'Agricultural', buildingType: 'Farms', calculationMethod: 'Exempt', rate: 0, description: 'Exempt unless commercial' },
            { ruleName: 'Livestock Land', propertyType: 'Agricultural', buildingType: 'Livestock land', calculationMethod: 'PerM2', rate: 0.1, description: '$0.1 per m2 for large scale' },

            // EXEMPT
            { ruleName: 'Mosque', propertyType: 'Religious', buildingType: 'Mosque', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Madrasa', propertyType: 'Educational', buildingType: 'Madrasa', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Quran School', propertyType: 'Educational', buildingType: 'Quran school', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Cemetery', propertyType: 'Religious', buildingType: 'Cemetery', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Government', propertyType: 'Government', buildingType: 'Government buildings', calculationMethod: 'Exempt', rate: 0 },
            { ruleName: 'Charity', propertyType: 'Charity', buildingType: 'Charity-owned buildings', calculationMethod: 'Exempt', rate: 0 }
        ];

        await TaxRule.insertMany(rules);
        console.log(`Seeded ${rules.length} Tax Rules successfully.`);

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

seedRules();
